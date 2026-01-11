// src/components/beranda/QuizReview.tsx
import { useState, useEffect } from 'react';
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

interface QuizReviewProps {
  totalQuestions: number;
  selectedQuestion: number; // nomor urut 1..N
  onSelectQuestion: (numOrder: number) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  onFontSizeChange: (size: 'small' | 'normal' | 'large') => void;
  grade: string | null;
  correctQuestions?: number[];
  incorrectQuestions?: number[];
}

interface ThemeFromDB {
  palette: keyof typeof tokensSet;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function QuizReview({
  totalQuestions,
  selectedQuestion,
  onSelectQuestion,
  showAll,
  onToggleShowAll,
  onFontSizeChange,
  grade,
  correctQuestions = [],
  incorrectQuestions = [],
}: QuizReviewProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [themePalette, setThemePalette] = useState(tokensSet.palette1);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Ambil tema dari DB
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

  // pewarnaan nomor soal
  const getButtonColorsForNum = (numOrder: number) => {
    if (correctQuestions.includes(numOrder)) {
      return { bg: themePalette.success, hover: themePalette.primaryDark, text: themePalette.primaryContrastText };
    }
    if (incorrectQuestions.includes(numOrder)) {
      return { bg: themePalette.error, hover: themePalette.primaryDark, text: themePalette.primaryContrastText };
    }
    return { bg: themePalette.surface, hover: themePalette.primary, text: themePalette.primaryContrastText };
  };

  const handleFontSize = (size: 'small' | 'normal' | 'large') => {
    setFontSize(size);
    onFontSizeChange(size);
  };

  const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);
  useEffect(() => {
    const onResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
            color: themePalette.primaryContrastText,
            fontWeight: 700,
            letterSpacing: 0.3,
            fontSize: '17px',
          }}
        >
          {grade !== null ? `Score: ${grade}` : 'Score: -'}
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

      {/* Collapsible content */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 1, pb: 1 }}>
          {/* Tombol kontrol */}
          <Stack direction="row" spacing={1} mb={1} alignItems="center" justifyContent={'space-between'} display={'flex'}>
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

            <Tooltip title={'Ubah ukuran huruf'} arrow>
              <Button
                size="small"
                variant={fontSize === 'small' ? 'contained' : 'outlined'}
                onClick={() => handleFontSize('small')}
                sx={{
                  flexGrow: 1,
                  minWidth: 'auto',
                  fontSize: '14px',
                  backgroundColor: fontSize === 'small' ? themePalette.primaryDark : themePalette.primaryLight,
                  color: fontSize === 'small' ? themePalette.primaryContrastText : themePalette.textPrimary,
                  borderColor: themePalette.primaryLight,
                  '&:hover': { bgcolor: themePalette.primaryDark, borderColor: themePalette.primaryDark },
                }}
              >
                A-
              </Button>
            </Tooltip>

            <Tooltip title={'Ubah ukuran huruf'} arrow>
              <Button
                size="small"
                variant={fontSize === 'normal' ? 'contained' : 'outlined'}
                onClick={() => handleFontSize('normal')}
                sx={{
                  flexGrow: 1,
                  minWidth: 'auto',
                  fontSize: '16px',
                  backgroundColor: fontSize === 'normal' ? themePalette.primaryDark : themePalette.primaryLight,
                  color: fontSize === 'normal' ? themePalette.primaryContrastText : themePalette.textPrimary,
                  borderColor: themePalette.primaryLight,
                  '&:hover': { bgcolor: themePalette.primaryDark, borderColor: themePalette.primaryDark },
                }}
              >
                A
              </Button>
            </Tooltip>

            <Tooltip title={'Ubah ukuran huruf'} arrow>
              <Button
                size="small"
                variant={fontSize === 'large' ? 'contained' : 'outlined'}
                onClick={() => handleFontSize('large')}
                sx={{
                  flexGrow: 1,
                  minWidth: 'auto',
                  fontSize: '18px',
                  backgroundColor: fontSize === 'large' ? themePalette.primaryDark : themePalette.primaryLight,
                  color: fontSize === 'large' ? themePalette.primaryContrastText : themePalette.textPrimary,
                  borderColor: themePalette.primaryLight,
                  '&:hover': { bgcolor: themePalette.primaryDark, borderColor: themePalette.primaryDark },
                }}
              >
                A+
              </Button>
            </Tooltip>
          </Stack>

          {/* Grid nomor soal */}
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
              maxHeight: isMobile ? 260 : windowHeight - 250,
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { backgroundColor: themePalette.pageBackground, borderRadius: '10px' },
              '&::-webkit-scrollbar-thumb': { backgroundColor: themePalette.primaryLight, borderRadius: '10px' },
              '&::-webkit-scrollbar-thumb:hover': { backgroundColor: themePalette.primaryDark },
              pb: '2px',
              pt: '4px',
            }}
          >
            {Array.from({ length: totalQuestions }, (_, idx) => {
              const numOrder = idx + 1;
              const isSelected = numOrder === selectedQuestion;
              const colors = getButtonColorsForNum(numOrder);

              return (
                <Button
                  key={numOrder}
                  onClick={() => onSelectQuestion(numOrder)}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: 1,
                    backgroundColor: isSelected ? themePalette.primaryDark : colors.bg,
               
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: 500,
                    position: 'relative',
                    '&:hover': { backgroundColor: isSelected ? themePalette.primaryDark : colors.hover },
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
