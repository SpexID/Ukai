import { useEffect, useState } from 'react';
import {
  Stack,
  Typography,
  Paper,
  Button,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';

interface Tryout {
  id: string;
  name: string;
  description: string;
  created_at: string;
  paket_id: string;
  pdf_url?: string;
}

interface QuizAttempt {
  grade: string | number | null;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function Paket() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, boolean>>({});
  const [bestGrades, setBestGrades] = useState<Record<string, number>>({});
  const [palette, setPalette] = useState(tokensSet.palette1);

  const paketId = searchParams.get('id');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = palette.primaryContrastText;
    document.documentElement.style.backgroundColor = palette.primaryContrastText;
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.surface]);

  useEffect(() => {
    const fetchUserTheme = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (
          res.data.tema &&
          tokensSet[res.data.tema as keyof typeof tokensSet]
        ) {
          setPalette(tokensSet[res.data.tema as keyof typeof tokensSet]);
        }
      } catch (err) {
        console.error('Error fetching user theme:', err);
      }
    };

    const fetchTryouts = async () => {
      if (!paketId) {
        setError('Paket ID tidak ditemukan');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const tryoutRes = await axios.get(`${API_BASE}/tryouts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const tryoutsArray = Array.isArray(tryoutRes.data)
          ? tryoutRes.data
          : [];
        const filteredTryouts = tryoutsArray.filter(
          (t: Tryout) => t.paket_id === paketId
        );
        setTryouts(filteredTryouts);

        const promises = filteredTryouts.map(async (t: Tryout) => {
          try {
            const res = await axios.get(`${API_BASE}/quizattempt/${t.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const attemptsData = res.data || [];
            const hasAttempt = attemptsData.length > 0;
            const best = hasAttempt
              ? Math.max(...attemptsData.map((a: QuizAttempt) => Number(a.grade) || 0))
              : null;
            return { id: t.id, hasAttempt, bestGrade: best };
          } catch {
            return { id: t.id, hasAttempt: false, bestGrade: null };
          }
        });

        const results = await Promise.all(promises);
        const attemptMap: Record<string, boolean> = {};
        const gradeMap: Record<string, number> = {};
        results.forEach((r) => {
          attemptMap[r.id] = r.hasAttempt;
          if (r.bestGrade !== null) gradeMap[r.id] = r.bestGrade!;
        });
        setAttempts(attemptMap);
        setBestGrades(gradeMap);
      } catch (err) {
        console.error('Error fetching tryouts:', err);
        setError('Gagal mengambil data tryout');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTheme();
    fetchTryouts();
  }, [paketId]);

  const handleTryoutClick = (tryout: Tryout) => {
    navigate(`/tryouts?id=${tryout.id}`);
  };

  const handleOpenPdf = (tryoutId: string) => {
    const url = `/pdfviewer?id=${tryoutId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 🟩 tombol kembali
  const handleBackClick = () => {
    navigate('/daftar-paketku'); // ubah ke path yang kamu mau
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 80) return palette.success;
    if (grade >= 41) return palette.info;
    return palette.error;
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Stack spacing={4} sx={{ p: 4, bgcolor: palette.primaryContrastText }}>
      {/* Tombol kembali di pojok kiri atas */}
      <Box sx={{ mb: 2 }}>
        <Button
          onClick={handleBackClick}
          variant="contained"
          sx={{
            backgroundColor: palette.primaryLight,
            color: palette.primaryContrastText,
            fontWeight: 'bold',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: palette.primaryDark,
            },
          }}
        >
          ← Kembali
        </Button>
      </Box>
      <Stack spacing={1}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 'bold', color: palette.btnSecondaryText }}
      >
        Tryout
      </Typography>
 <Typography
        variant="body1"
        sx={{color: palette.btnSecondaryText,margin:0 }}
      >
        Buka pembasan dengan mengikuti tryout 
      </Typography>
      </Stack>
      {tryouts.length === 0 ? (
        <Typography>Tidak ada tryout untuk paket ini</Typography>
      ) : (
        <Stack spacing={2}>
          {tryouts.map((tryout) => {
            return (
              <Paper
                key={tryout.id}
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: palette.primary,
                  bgcolor: palette.primary,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                }}
              >
                <Box sx={{ flex: 1, mb: isMobile ? 2 : 0 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: palette.primaryContrastText,
                    }}
                  >
                    {tryout.name}
                  </Typography>

                  {!isMobile &&
                    attempts[tryout.id] &&
                    bestGrades[tryout.id] !== undefined && (
                      <Box sx={{ mt: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 'bold',
                            color: getGradeColor(bestGrades[tryout.id]),
                          }}
                        >
                          {bestGrades[tryout.id]}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={palette.primaryContrastText}
                        >
                          Nilai Terbaik
                        </Typography>
                      </Box>
                    )}
                </Box>

                <Stack
                  direction={isMobile ? 'column' : 'row'}
                  spacing={2}
                  sx={{ width: isMobile ? '100%' : 'auto' }}
                >
                  <Button
                    variant="contained"
                    onClick={() => handleTryoutClick(tryout)}
                    sx={{
                      backgroundColor: palette.primaryLight,
                      '&:hover': {
                        backgroundColor: palette.primaryDark,
                      },
                    }}
                  >
                    Tryout
                  </Button>

                  {tryout.pdf_url && (
                    <Button
                      variant="contained"
                      disabled={!attempts[tryout.id]}
                      onClick={() => handleOpenPdf(tryout.id)}
                      sx={{
                        color: palette.primaryContrastText,
                        bgcolor: palette.info,
                        borderColor: palette.info,
                        '&:hover': {
                          backgroundColor: palette.info,
                        },
                      }}
                    >
                      Pembahasan
                    </Button>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
