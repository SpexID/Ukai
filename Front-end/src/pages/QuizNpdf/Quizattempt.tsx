// src/pages/Tryout.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState, useCallback } from 'react';
import {
  Stack,
  Typography,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  useMediaQuery,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';

interface Material {
  type: string;
  title: string;
  url: string;
}

interface Attempt {
  id: number;
  user_id: number;
  tryout_id: string;
  attempt_number: number;
  grade: string | null;
  status: 'ongoing' | 'finished' | 'submitted' | 'graded' | string;
  question_order: string;
  answer_order: string;
  start_time: string;
  submitted_at: string | null;
  duration_minutes?: number | null;
}

interface TryoutDetail {
  id: string;
  name: string;
  description: string;
  created_at: string;
  paket_id: string;
  materials?: Material[];
  // Accept both lowercased and camelCase property names from backend
  attemptsallowed?: number;
  attemptsAllowed?: number;
  timeLimit?: string;
  gradingMethod?: string;
  duration_minutes?: number | null;
}

interface QuestionRowFromServer {
  id: number;
  answer_key: string;
}

interface RankingResponse {
  tryoutId?: string;
  attemptNumber?: number;
  rank: number | null;
  total: number;
  text?: string;
  message?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function Tryout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tryoutId = searchParams.get('id');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tryoutData, setTryoutData] = useState<TryoutDetail | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [palette, setPalette] = useState(tokensSet.palette1);
  const [paketExpired, setPaketExpired] = useState(false);
  const [paketId, setPaketId] = useState('');

  // mapping attempt.id -> "rank/total" (string). '-' when unavailable.
  const [rankings, setRankings] = useState<Record<number, string>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const getRemainingSeconds = (att: Attempt): number => {
    const duration = att.duration_minutes ?? tryoutData?.duration_minutes;
    if (!att || !att.start_time || typeof duration === 'undefined' || duration === null) return 0;
    const start = new Date(att.start_time).getTime();
    const total = duration * 60 * 1000;
    const elapsed = Math.max(0, now - start);
    const remainingMs = total - elapsed;
    return Math.ceil(remainingMs / 1000);
  };

  const formatHMS = (secTotal: number) => {
    if (secTotal <= 0) return '00:00:00';
    const s = Math.max(0, secTotal);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = Math.floor(s % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  };

  // ------------------ Normalizer + Helpers ------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeAttempt = (a: any): Attempt => {
    // Ensure fields are normalized: status lowercase; empty strings -> null for grade/submitted_at
    const statusRaw = a?.status ?? '';
    const status = String(statusRaw).toLowerCase();
    const gradeRaw = a?.grade;
    const grade = gradeRaw === null || gradeRaw === '' ? null : String(gradeRaw);
    const submitted_at_raw = a?.submitted_at;
    const submitted_at = submitted_at_raw === null || submitted_at_raw === '' ? null : String(submitted_at_raw);
    const start_time = a?.start_time ? String(a.start_time) : '';
    const duration_minutes = typeof a?.duration_minutes === 'number' ? a.duration_minutes : a?.duration_minutes ?? null;

    return {
      ...a,
      status,
      grade,
      submitted_at,
      start_time,
      duration_minutes,
    } as Attempt;
  };

  const isFinishedAttempt = (a: Attempt) => {
    // treat as finished if status explicitly in finished/submitted/graded
    // OR we have submitted_at + a non-null grade (defensive)
    const statusFinished = ['finished', 'submitted', 'graded'].includes(String(a.status ?? '').toLowerCase());
    const hasSubmittedAndGrade = !!a.submitted_at && a.grade !== null && a.grade !== '';
    return statusFinished || hasSubmittedAndGrade;
  };

  const isActiveAttempt = (a: Attempt) => {
    // ongoing + remaining > 0
    return String(a.status ?? '').toLowerCase() === 'ongoing' && getRemainingSeconds(a) > 0;
  };
  // -----------------------------------------------------------

  useEffect(() => {
    if (!tryoutId) {
      setError('Tryout ID tidak ditemukan');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Unauthorized: token tidak ditemukan');
          setLoading(false);
          return;
        }

        // Ambil tema user dari DB terlebih dahulu (untuk styling)
        try {
          const userRes = await axios.get(`${API_BASE}/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const tema = userRes.data?.tema;
          if (tema && tokensSet[tema as keyof typeof tokensSet]) {
            setPalette(tokensSet[tema as keyof typeof tokensSet]);
          }
        } catch (err) {
          // tidak fatal — tetap lanjut fetch tryout
        }

        // Ambil data tryout terlebih dahulu
        const tryoutRes = await axios.get<TryoutDetail>(
          `${API_BASE}/tryouts/${encodeURIComponent(tryoutId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Normalize tryout data to ensure attemptsallowed property exists (prefer backend's attemptsallowed, fallback to attemptsAllowed)
        const rawTryout = tryoutRes.data ?? {};
        const attemptsAllowedNormalized =
          typeof rawTryout.attemptsallowed === 'number'
            ? rawTryout.attemptsallowed
            : typeof rawTryout.attemptsAllowed === 'number'
            ? rawTryout.attemptsAllowed
            : undefined;

        const normalizedTryout: TryoutDetail = {
          ...rawTryout,
          attemptsallowed: attemptsAllowedNormalized ?? rawTryout.attemptsallowed ?? rawTryout.attemptsAllowed ?? 3,
        };
        setTryoutData(normalizedTryout);

        // ambil data paket untuk cek expired (menggunakan paket_id dari tryoutRes)
        try {
          const paketRes = await axios.get(`${API_BASE}/pakets`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const paketArray = Array.isArray(paketRes.data) ? paketRes.data : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const paketData = paketArray.find((p: any) => p.id === tryoutRes.data.paket_id) ?? null;

          if (paketData?.closed_at) {
            const closedDate = new Date(paketData.closed_at).getTime();
            setPaketExpired(closedDate < Date.now());
          } else {
            setPaketExpired(false);
          }
        } catch (err) {
          // Jika gagal mengambil paket, jangan crash — anggap tidak expired
          console.warn('Gagal ambil data paket untuk cek expired', err);
          setPaketExpired(false);
        }

        // Ambil attempts
        const attemptRes = await axios.get<Attempt[]>(
          `${API_BASE}/quizattempt/${encodeURIComponent(tryoutId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const attemptRows = Array.isArray(attemptRes.data) ? attemptRes.data : [];
        // normalize attempts
        const normalizedAttempts = attemptRows.map(normalizeAttempt);
        setAttempts(normalizedAttempts);

        // debug (optional)
        // console.debug('tryout fetched:', normalizedTryout);
        // console.debug('attempts fetched (normalized):', normalizedAttempts);
      } catch (err) {
        console.error(err);
        setError('Gagal mengambil data tryout');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [tryoutId]);

  const fetchAttempts = useCallback(async () => {
    if (!tryoutId) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const attemptRes = await axios.get<Attempt[]>(
        `${API_BASE}/quizattempt/${encodeURIComponent(tryoutId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rows = Array.isArray(attemptRes.data) ? attemptRes.data : [];
      setAttempts(rows.map(normalizeAttempt));
    } catch (err) {
      console.error('Fetch attempts error', err);
    }
  }, [tryoutId]);

  const finishAttempt = async (a: Attempt, grade?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token not found');
      const patchData: Partial<Pick<Attempt, 'status' | 'submitted_at' | 'grade'>> = {
        status: 'finished',
        submitted_at: new Date().toISOString(),
      };
      if (grade !== undefined) patchData.grade = grade;

      const patchRes = await axios.patch<Attempt>(
        `${API_BASE}/quizattempt/${encodeURIComponent(a.tryout_id)}/${encodeURIComponent(String(a.attempt_number))}`,
        patchData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return patchRes.data;
    } catch (err) {
      console.error('finishAttempt error', err);
      throw err;
    }
  };

  const handleStartAttempt = useCallback(async () => {
    if (!tryoutData || !tryoutId) return;
    if (paketExpired) {
      alert('Paket ini sudah kadaluarsa. Tidak dapat memulai attempt baru.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    // Use isActiveAttempt helper
    const anyActive = attempts.some(a => isActiveAttempt(a));
    if (anyActive) {
      alert('Masih ada attempt yang sedang berjalan. Selesaikan / tunggu sampai waktu habis dahulu.');
      return;
    }

    try {
      setLoading(true);
      const toFinish = attempts.filter(a => String(a.status ?? '').toLowerCase() === 'ongoing');
      if (toFinish.length > 0) {
        await Promise.all(toFinish.map(a => finishAttempt(a).catch(() => {})));
      }

      const postRes = await axios.post<Attempt>(
        `${API_BASE}/quizattempt/start`,
        { tryout_id: tryoutData.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const created = postRes.data;
      navigate(`/quiz?tryoutId=${created.tryout_id}&attempt=${created.attempt_number}`);
    } catch (err) {
      console.error('Error starting attempt:', err);
      alert('Gagal memulai attempt');
    } finally {
      setLoading(false);
      void fetchAttempts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, fetchAttempts, navigate, tryoutData, tryoutId, paketExpired]);

  const handleContinueAttempt = (a: Attempt) => {
    navigate(`/quiz?tryoutId=${a.tryout_id}&attempt=${a.attempt_number}`);
  };

  useEffect(() => {
    if (!tryoutId) return;

    const token = localStorage.getItem('token');
    axios
      .get(`${API_BASE}/tryouts/${tryoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPaketId(res.data.paket_id);
      })
      .catch((err) => {
        console.error('Gagal fetch tryout:', err);
      })
      .finally(() => setLoading(false));
  }, [tryoutId]);

  const handleBackClick = () => {
    if (paketId) {
      navigate(`/paketku?id=${paketId}`);
    } else {
      alert('Paket ID tidak ditemukan');
    }
  };

  const handleGradeAttempt = async (a: Attempt) => {
    const ok = window.confirm('Waktu habis untuk attempt ini. Lanjutkan untuk menandai selesai dan melakukan grading?');
    if (!ok) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token not found');

      const questionIds = (a.question_order || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(s => parseInt(s, 10));

      const userTokens = (a.answer_order || '')
        .split(',')
        .map(s => s.trim());

      const qRes = await axios.get<QuestionRowFromServer[]>(
        `${API_BASE}/questions?tryoutId=${encodeURIComponent(a.tryout_id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allQuestions = Array.isArray(qRes.data) ? qRes.data : [];

      const answerKeyMap = new Map<number, string>();
      for (const q of allQuestions) {
        answerKeyMap.set(q.id, (q.answer_key ?? '').toString().trim());
      }

      const letterToNumber: Record<string, string> = { a: '1', b: '2', c: '3', d: '4', e: '5' };

      let correct = 0;
      for (let i = 0; i < questionIds.length; i++) {
        const qid = questionIds[i];
        const rawUserToken = (userTokens[i] ?? '').trim();
        const cleaned = rawUserToken.replace(/f/g, '').trim();

        if (!cleaned || cleaned === '-') continue;

        const expected = answerKeyMap.get(qid);
        if (typeof expected === 'undefined') continue;

        const expectedNorm = expected.toString().trim().toLowerCase();
        const userNorm = cleaned.toLowerCase();

        let matched = false;

        if (/^\d+$/.test(expectedNorm)) {
          if (/^[a-e]$/.test(userNorm)) {
            matched = (letterToNumber[userNorm] === expectedNorm);
          } else {
            matched = (userNorm === expectedNorm);
          }
        } else {
          matched = (userNorm === expectedNorm);
        }

        if (matched) correct++;
      }

      const totalQuestions = questionIds.length || 1;
      const grade = ((correct / totalQuestions) * 100).toFixed(2);

      await finishAttempt(a, grade);

      await fetchAttempts();
      navigate(`/review?tryoutId=${a.tryout_id}&attempt=${a.attempt_number}`);
    } catch (err) {
      console.error('Grade attempt failed', err);
      alert('Gagal menyelesaikan attempt. Lihat console untuk detail.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAttempt = (a: Attempt) => {
    navigate(`/review?tryoutId=${a.tryout_id}&attempt=${a.attempt_number}`);
  };

  // ---------- RANKINGS FETCH (frontend) ----------
  // For each finished attempt, request backend ranking endpoint and store in `rankings`.
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('token');
    if (!token || !tryoutId) return;

    // Only attempts that are truly finished (normalized) and have grade + submitted_at
    const finishedAttempts = attempts.filter(a => isFinishedAttempt(a) && a.grade !== null && !!a.submitted_at);

    if (finishedAttempts.length === 0) {
      // clear rankings for safety
      if (mounted) setRankings({});
      return;
    }

    // Only fetch for attempts that we don't already have in `rankings`
    const toFetch = finishedAttempts.filter(a => !(a.id in rankings));

    if (toFetch.length === 0) return;

    (async () => {
      try {
        const promises = toFetch.map(async (a) => {
          try {
            const res = await axios.get<RankingResponse>(
              `${API_BASE}/quizattempt/ranking/${encodeURIComponent(a.tryout_id)}/${encodeURIComponent(String(a.attempt_number))}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = res.data;
            // backend returns rank (number|null) and total (number)
            if (data && typeof data.rank === 'number' && typeof data.total === 'number' && data.total > 0) {
              return { id: a.id, text: `${data.rank}/${data.total}` };
            }
            // if backend returns text already
            if (data && data.text) {
              return { id: a.id, text: data.text };
            }
            // if backend says user belum ikut attempt
            return { id: a.id, text: '-' };
          } catch (err) {
            // on error just put '-'
            console.warn('Failed fetch ranking for attempt', a.attempt_number, err);
            return { id: a.id, text: '-' };
          }
        });

        const results = await Promise.all(promises);
        if (!mounted) return;
        setRankings((prev) => {
          const next = { ...prev };
          results.forEach(r => {
            next[r.id] = r.text;
          });
          return next;
        });
      } catch (err) {
        console.error('Error fetching rankings', err);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, tryoutId]); // intentionally not depending on `rankings` to avoid infinite loops
  // -------------------------------------------------

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!tryoutData) return <Typography>Tidak ada data tryout</Typography>;

  // consumed attempts count: only count attempts that are finished or currently active (ongoing)
  const consumedAttemptsCount = attempts.filter(a =>
    (typeof a.attempt_number === 'number' && a.attempt_number > 0) &&
    (isFinishedAttempt(a) || isActiveAttempt(a))
  ).length;

  const startDisabled =
    paketExpired ||
    attempts.some(a => isActiveAttempt(a)) ||
    (consumedAttemptsCount >= (tryoutData?.attemptsallowed ?? 3));

  const formatMinutesReadable = (mins?: number | null) => {
    if (typeof mins !== 'number' || Number.isNaN(mins) || mins === null) return 'N/A';
    const m = Math.floor(mins);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return mm === 0 ? `${h}h (${m} minutes)` : `${h}h ${mm}m (${m} minutes)`;
    }
    return `${m} minutes`;
  };

  const displayTimeLimit = (() => {
    if (typeof tryoutData?.duration_minutes === 'number') {
      return formatMinutesReadable(tryoutData.duration_minutes);
    }
    const anyDur = attempts.find(a => typeof a.duration_minutes === 'number' && a.duration_minutes !== null);
    if (anyDur?.duration_minutes) return formatMinutesReadable(anyDur.duration_minutes);
    return 'N/A';
  })();

  // ---------- render ----------
  return (
    <Stack spacing={4} sx={{ p: 2, bgcolor: palette.primaryContrastText }}>
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
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: palette.btnSecondaryText }}>{tryoutData.name}</Typography>

      <Stack spacing={1}>
        <Typography sx={{ color: palette.btnSecondaryText }}><strong>Jumlah percobaan:</strong> {tryoutData.attemptsallowed ?? 3}</Typography>
        <Typography sx={{ color: palette.btnSecondaryText }}><strong>Batas waktu:</strong> {displayTimeLimit}</Typography>
        <Typography sx={{ color: palette.btnSecondaryText }}><strong>Metode penilaian:</strong> {tryoutData.gradingMethod ?? 'Nilai tertinggi'}</Typography>
      </Stack>

      {tryoutData.materials && tryoutData.materials.length > 0 && (
        <>
          <Divider />
          <Typography variant="h5" sx={{ color: palette.textPrimary }}>Materials</Typography>
          <Stack spacing={1}>
            {tryoutData.materials.map((m, idx) => (
              <Button
                key={idx}
                variant="outlined"
                component="a"
                href={m.url}
                target="_blank"
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: palette.textPrimary,
                  borderColor: palette.textSecondary,
                }}
              >
                {m.title} ({m.type})
              </Button>
            ))}
          </Stack>
        </>
      )}

      <Divider />
      <Typography variant="h5" sx={{ color: palette.btnSecondaryText }}>Riwayat ujian</Typography>

      {attempts.length === 0 ? (
        <Typography sx={{ fontStyle: 'italic', color: palette.btnSecondaryText }}>Tidak ada riwayat ujian</Typography>
      ) : isMobile ? (
        <Stack spacing={2}>
          {[...attempts]
            .sort((a, b) => a.attempt_number - b.attempt_number)
            .map((a) => {
              const remainingSec = getRemainingSeconds(a);
              const isActive = isActiveAttempt(a);
              const isExpiredOngoing = String(a.status ?? '').toLowerCase() === 'ongoing' && remainingSec <= 0;
              const isFinished = isFinishedAttempt(a);

              return (
                <Paper key={`${a.tryout_id}-${a.attempt_number}`} sx={{ p: 2, border: `1px solid ${palette.btnSecondaryText}`, borderRadius: 1, bgcolor: palette.primaryContrastText }}>
                  <Stack spacing={1}>
                    <Typography sx={{ color: palette.btnSecondaryText }}><strong>Ujian #{a.attempt_number}</strong></Typography>

                    <Stack flexDirection={'row'} justifyContent={'space-between'}>
                      <Typography sx={{ color: palette.btnSecondaryText }}>Nilai: {a.grade ?? '-'}</Typography>
                      <Typography sx={{ color: palette.btnSecondaryText }}>
                        Peringkat: {a.grade && a.submitted_at ? (rankings[a.id] ?? '—') : '-'}
                      </Typography>
                    </Stack>

                    <Stack flexDirection={'row'} justifyContent={'space-between'}>
                      <Typography sx={{ color: palette.btnSecondaryText }}>
                        Status:{' '}
                        {isFinished ? 'Selesai' : isExpiredOngoing ? 'Waktu habis' : `Berlangsung — ${formatHMS(remainingSec)}`}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {a.status === 'ongoing' ? (
                          isActive ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleContinueAttempt(a)}
                              sx={{
                                backgroundColor: palette.info,
                                color: palette.primaryContrastText,
                                fontFamily: 'Poppins',
                                '&:hover': {
                                  backgroundColor: palette.primaryDark,
                                },
                              }}
                            >
                              Lanjutkan
                            </Button>
                          ) : (
                            <Button size="small" variant="contained" onClick={() => void handleGradeAttempt(a)} sx={{ backgroundColor: palette.warning, color: palette.primaryContrastText, fontFamily: 'Poppins',
                              '&:hover': { backgroundColor: palette.warning }}}>
                              Nilai
                            </Button>
                          )
                        ) : (
                          <Button size="small" variant="contained" onClick={() => handleReviewAttempt(a)} sx={{ color: palette.primaryContrastText, borderColor: palette.primaryDark, backgroundColor: palette.primaryDark, fontFamily: 'Poppins',
                            '&:hover': { backgroundColor: palette.primaryDark }}}>
                            Tinjau ulang
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
        </Stack>
      ) : (
        <Paper elevation={0} sx={{ p: 2, border: `1px solid ${palette.textSecondary}`, borderRadius: 1, bgcolor: palette.primaryContrastText }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: palette.btnSecondaryText }}>No.</TableCell>
                <TableCell sx={{ color: palette.btnSecondaryText }}>Status / Waktu tersisa</TableCell>
                <TableCell sx={{ color: palette.btnSecondaryText }}>Nilai</TableCell>
                <TableCell sx={{ color: palette.btnSecondaryText }}>Peringkat</TableCell>
                <TableCell sx={{ color: palette.btnSecondaryText }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...attempts]
                .sort((a, b) => a.attempt_number - b.attempt_number)
                .map((a) => {
                  const remainingSec = getRemainingSeconds(a);
                  const isActive = isActiveAttempt(a);
                  const isExpiredOngoing = String(a.status ?? '').toLowerCase() === 'ongoing' && remainingSec <= 0;
                  const isFinished = isFinishedAttempt(a);

                  return (
                    <TableRow key={`${a.tryout_id}-${a.attempt_number}`}>
                      <TableCell sx={{ color: palette.btnSecondaryText }}>{a.attempt_number}</TableCell>
                      <TableCell>
                        {isFinished ? (
                          <Typography sx={{ color: palette.btnSecondaryText }}>Selesai</Typography>
                        ) : isExpiredOngoing ? (
                          <Typography sx={{ color: palette.warning }}>Waktu Habis</Typography>
                        ) : (
                          <Typography sx={{ color: palette.info }}>Berlangsung — {formatHMS(remainingSec)}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: palette.btnSecondaryText }}>{a.grade ?? '-'}</TableCell>

                      {/* Ranking column */}
                      <TableCell sx={{ color: palette.btnSecondaryText }}>
                        {a.grade && a.submitted_at ? (rankings[a.id] ?? '—') : '-'}
                      </TableCell>

                      <TableCell>
                        {a.status === 'ongoing' ? (
                          isActive ? (
                            <Button size="small" variant="contained" onClick={() => handleContinueAttempt(a)} sx={{ backgroundColor: palette.info, color: palette.primaryContrastText, fontFamily: 'Poppins',
                              '&:hover': { backgroundColor: palette.primaryDark }}}>
                              Lanjutkan
                            </Button>
                          ) : (
                            <Button size="small" variant="contained" onClick={() => void handleGradeAttempt(a)} sx={{ backgroundColor: palette.warning, color: palette.primaryContrastText, fontFamily: 'Poppins',
                              '&:hover': { backgroundColor: palette.warning }}}>
                              Nilai
                            </Button>
                          )
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => handleReviewAttempt(a)} sx={{ color: palette.btnSecondaryText, borderColor: palette.btnSecondaryText, fontFamily: 'Poppins',
                            '&:hover': { backgroundColor: palette.primaryContrastText }}}>
                            Tinjau ulang
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {paketExpired && (
        <Typography color="error" sx={{ fontWeight: 600 }}>
          ⚠️ Paket ini sudah kadaluarsa. Kamu tidak dapat memulai ujian baru.
        </Typography>
      )}

      <Button
        variant="contained"
        onClick={() => void handleStartAttempt()}
        disabled={startDisabled}
        sx={{
          backgroundColor: startDisabled ? '#bdbdbd' : palette.primary,
          color: startDisabled ? '#fff' : palette.primaryContrastText,
          '&:hover': { backgroundColor: startDisabled ? '#bdbdbd' : palette.primaryDark, fontFamily: 'Poppins' },
        }}
      >
        Mulai Ujian
      </Button>
    </Stack>
  );
}
