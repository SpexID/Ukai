// src/components/QuizNavigation.tsx
import { useEffect, useState, useRef } from 'react';
import {
  Stack,
  Button,
  Box,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Typography,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';

interface QuizNavigationProps {
  totalQuestions: number;
  selectedQuestion: number;
  onSelectQuestion: (numOrder: number) => void;
  answeredQuestions: number[];
  flaggedQuestions: number[];
  onToggleFlag: (numOrder: number) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  durationMinutes: number;
  startTime: string;
  onTimeUp: () => void;
  onFontSizeChange: (size: 'small' | 'normal' | 'large') => void;
}

interface ThemeFromDB {
  palette: keyof typeof tokensSet;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const WS_FALLBACK = (API_BASE || 'http://localhost:3000').replace(/^http/, 'ws');
const WS_URL = (import.meta.env.VITE_WS_URL as string) || WS_FALLBACK;

export default function QuizNavigation({
  totalQuestions,
  selectedQuestion,
  onSelectQuestion,
  answeredQuestions,
  flaggedQuestions,
  showAll,
  onToggleShowAll,
  durationMinutes,
  startTime,
  onTimeUp,
  onFontSizeChange,
}: QuizNavigationProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60);
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [themePalette, setThemePalette] = useState(tokensSet.palette1);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);
  useEffect(() => {
    const onResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---------------- THEME FROM DB ----------------
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get<ThemeFromDB>(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.palette && tokensSet[res.data.palette]) {
          setThemePalette(tokensSet[res.data.palette]);
        }
      } catch (err) {
        console.error('Gagal ambil tema', err);
      }
    };

    void fetchTheme();
  }, []);

  // ---------------- WEBSOCKET ----------------
  const wsRef = useRef<WebSocket | null>(null);
  const [serverBaseMs, setServerBaseMs] = useState<number | null>(null);
  const [perfBase, setPerfBase] = useState<number | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] Connected');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const serverNowStr = data?.server_now ?? data?.serverTime ?? data?.server_now;
        if (serverNowStr) {
          const serverMs = new Date(serverNowStr).getTime();
          setServerBaseMs(serverMs);
          setPerfBase(performance.now());
        }
      } catch (err) {
        console.error('[WS] invalid data:', event.data);
      }
    };
    ws.onerror = (e) => console.error('[WS] error', e);
    ws.onclose = () => console.warn('[WS] closed');

    // cleanup on unmount
    return () => {
      console.log('[WS] cleanup');
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // ---------------- TIMER ----------------
  useEffect(() => {
    let rafId: number;
    let intervalId: NodeJS.Timeout;
    const startMs = new Date(startTime).getTime();
    const endMs = startMs + durationMinutes * 60 * 1000;

    const updateTime = () => {
      const nowMs =
        serverBaseMs && perfBase
          ? serverBaseMs + (performance.now() - perfBase)
          : Date.now();
      const remaining = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        onTimeUp();
      } else {
        rafId = requestAnimationFrame(updateTime);
      }
    };

    updateTime();
    // eslint-disable-next-line prefer-const
    intervalId = setInterval(() => updateTime(), 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, [serverBaseMs, perfBase, startTime, durationMinutes, onTimeUp]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const handleFontSize = (size: 'small' | 'normal' | 'large') => {
    setFontSize(size);
    onFontSizeChange(size);
  };

  const gridMaxHeight = isMobile ? 260 : windowHeight - 250;

  // ---------------- UI ----------------
  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, width: '100%', bgcolor: themePalette.primaryContrastText }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: themePalette.primaryDark,
          borderColor: themePalette.primary,
          px: 1,
          py: 0.5,
          minHeight: 44,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: timeLeft < 60 ? themePalette.error : themePalette.primaryContrastText,
            fontWeight: 700,
            letterSpacing: 0.3,
            fontSize: '17px',
          }}
        >
          ⏳ Waktu tersisa : {formatTime(timeLeft)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={expanded ? 'Sembunyikan' : 'Tampilkan'} arrow>
            <IconButton
              size="small"
              aria-label="expand"
              onClick={() => setExpanded((e) => !e)}
              sx={{
                color: themePalette.primaryContrastText,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: '0.25s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
              }}
            >
              <ExpandMoreIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 1, pb: 1 }}>
          <Stack direction="row" spacing={1} mb={1} alignItems="center" justifyContent="space-between" display="flex">
            <Tooltip title={showAll ? 'Fokus ke satu soal' : 'Perlihatkan semua soal'} arrow>
              <Button
                size="small"
                variant="contained"
                onClick={onToggleShowAll}
                sx={{
                  flexGrow: 1,
                  minWidth: 'auto',
                  bgcolor: themePalette.primaryDark,
                  borderColor: themePalette.primaryDark,
                  color: themePalette.primaryContrastText,
                  '&:hover': {
                    bgcolor: themePalette.primaryLight,
                    borderColor: themePalette.primaryLight,
                  },
                }}
              >
                {showAll ? 'Semua soal' : 'Lihat 1 soal'}
              </Button>
            </Tooltip>

            {['small', 'normal', 'large'].map((size) => (
              <Tooltip key={size} title={'Ubah ukuran huruf'} arrow>
                <Button
                  size="small"
                  variant={fontSize === size ? 'contained' : 'outlined'}
                  onClick={() => handleFontSize(size as 'small' | 'normal' | 'large')}
                  sx={{
                    flexGrow: 1,
                    minWidth: 'auto',
                    fontSize: size === 'small' ? '14px' : size === 'normal' ? '16px' : '18px',
                    backgroundColor: fontSize === size ? themePalette.primaryDark : themePalette.primaryLight,
                    color: fontSize === size ? themePalette.primaryContrastText : themePalette.textPrimary,
                    borderColor: themePalette.primaryLight,
                    '&:hover': {
                      bgcolor: themePalette.primaryDark,
                      borderColor: themePalette.primaryDark,
                    },
                  }}
                >
                  {size === 'small' ? 'A-' : size === 'normal' ? 'A' : 'A+'}
                </Button>
              </Tooltip>
            ))}
          </Stack>

          <Box
            display="grid"
            gridTemplateColumns={{
              xs: 'repeat(5, 1fr)',
              sm: 'repeat(6, 1fr)',
              md: 'repeat(8, 1fr)',
              lg: 'repeat(10, 1fr)',
            }}
            gap={1}
            sx={{
              maxHeight: gridMaxHeight,
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': {
                backgroundColor: themePalette.primary,
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: themePalette.primaryLight,
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb:hover': { backgroundColor: themePalette.primaryDark },
              pb: '2px',
              pt: '4px',
            }}
          >
            {Array.from({ length: totalQuestions }, (_, idx) => {
              const numOrder = idx + 1;
              const isSelected = numOrder === selectedQuestion;
              const isAnswered = answeredQuestions.includes(numOrder);
              const flagged = flaggedQuestions.includes(numOrder);

              return (
                <Button
                  key={numOrder}
                  onClick={() => onSelectQuestion(numOrder)}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: 1,
                    backgroundColor: flagged
  ? themePalette.error               // merah kalau flagged
  : isSelected
  ? themePalette.primaryLight
  : isAnswered
  ? themePalette.primary
  : themePalette.surface,
                    color: isSelected || isAnswered ? themePalette.primaryContrastText : themePalette.textPrimary,
                    fontSize: 13,
                    fontWeight: 500,
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: isSelected
                        ? themePalette.primaryDark
                        : isAnswered
                        ? themePalette.primaryLight
                        : themePalette.primaryDark,
                    },
                   
                  }}
                >
                  {numOrder}
                </Button>
              );
            })}
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
}
