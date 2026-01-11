// src/pages/Quiz/quizreview.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Stack,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Typography,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QuestionForm, { Question as QCompQuestion } from '../../components/beranda/soalreview';
import QuizNavigation from '../../components/beranda/soalnavreview';
import { tokensSet } from '../../theme/tokens';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function QuizReview(): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const state = (location.state || {}) as { tryoutId?: string; attempt?: number };
  const tryoutIdFromState = state.tryoutId ?? null;
  const attemptFromState = state.attempt ?? null;

  const tryoutIdQuery = searchParams.get('tryoutId');
  const attemptQuery = searchParams.get('attempt');

  const tryoutId = tryoutIdFromState ?? tryoutIdQuery;
  const attemptNumber = attemptFromState ?? (attemptQuery ? Number(attemptQuery) : null);

  interface Question {
    id: number;
    text: string;
    options: { id: string; text: string }[];
    answerKey?: string;
    explanation?: string;
    image?: string;
    table?: { headers: string[]; rows: string[][] };

    // pembahasan
    explanationImage?: string;
    explanationTable?: { headers: string[]; rows: string[][] };
  }

  interface ServerQuestion {
    id: number;
    question_text: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    option_e: string | null;
    answer_key: string;
    explanation: string;
    image_url?: string | null;
    table_headers?: string[] | string | null;
    table_rows?: string[][] | string | null;

    explanation_image_url?: string | null;
    explanation_table_headers?: string[] | string | null;
    explanation_table_rows?: string[][] | string | null;
  }

  interface QuizAttemptFromServer {
    id: number;
    user_id: number;
    tryout_id: string;
    attempt_number: number;
    grade: string | null;
    status: string;
    question_order: string;
    answer_order: string;
    submitted_at: string | null;
    start_time: string | null;
    duration_minutes: number;
  }

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttemptFromServer | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [activeInViewId, setActiveInViewId] = useState<number | null>(null);

  // theme palette from DB (tokens)
  const [themePalette, setThemePalette] = useState(tokensSet.palette1);

  const parseHeaders = (headers?: string[] | string | null): string[] | undefined => {
    if (!headers) return undefined;
    if (Array.isArray(headers)) return headers;
    return (headers as string).split('|').map(h => h.trim());
  };

  const parseRows = (rows?: string[][] | string | null): string[][] | undefined => {
    if (!rows) return undefined;
    if (Array.isArray(rows)) return rows as string[][];
    return (rows as string)
      .split(';')
      .map(r => r.split('|').map(c => c.trim()))
      .filter(r => r.length > 0);
  };

  const parseAttemptAnswersAndFlags = (attempt: QuizAttemptFromServer | null) => {
    if (!attempt) return { answersMap: {} as Record<number, string>, flaggedIds: [] as number[] };

    const qOrder = (attempt.question_order || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => Number(s));

    const ansArr = (attempt.answer_order || '').split(',');
    while (ansArr.length < qOrder.length) ansArr.push('-');

    const answersMap: Record<number, string> = {};
    const flaggedIds: number[] = [];

    qOrder.forEach((qid, idx) => {
      const token = (ansArr[idx] ?? '').trim();
      if (token.includes('f')) flaggedIds.push(qid);
      const cleaned = token.replace(/f/g, '').trim();
      if (/^[a-eA-E]$/.test(cleaned)) {
        answersMap[qid] = cleaned.toLowerCase();
      }
    });

    return { answersMap, flaggedIds };
  };

  // ambil tema user dari DB supaya bisa dipakai untuk styling lokal di halaman Review
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // server /user returns user object; expect `tema` field (e.g. 'palette1')
        const tema = res.data?.tema ?? res.data?.palette;
        if (tema && typeof tema === 'string' && (tema as keyof typeof tokensSet) in tokensSet) {
          setThemePalette(tokensSet[tema as keyof typeof tokensSet]);
        }
      } catch (err) {
        // fail silently and keep default palette
        // console.error('Failed to fetch user theme', err);
      }
    };
    void fetchTheme();
  }, []);

  // set body/html background to match palette.surface (and restore on unmount)
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    if (themePalette?.surface) {
      document.body.style.backgroundColor = themePalette.primary;
      document.documentElement.style.backgroundColor = themePalette.primary;
    }
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themePalette.surface]);
document.body.style.backgroundColor = 'white';
document.documentElement.style.backgroundColor ='white';
  useEffect(() => {
    let mounted = true;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Token tidak ditemukan.');
        if (!tryoutId) throw new Error('tryoutId tidak diberikan.');
        if (!attemptNumber) throw new Error('Attempt number tidak diberikan.');

        const qRes = await axios.get<ServerQuestion[]>(
          `${API_BASE}/questions?tryoutId=${encodeURIComponent(tryoutId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!mounted) return;

        const mapped: Question[] = (qRes.data || []).map((q) => {
          const table = (() => {
            const headersParsed = parseHeaders(q.table_headers);
            const rowsParsed = parseRows(q.table_rows);
            return headersParsed && rowsParsed ? { headers: headersParsed, rows: rowsParsed } : undefined;
          })();

          const explanationTable = (() => {
            const headersParsed = parseHeaders(q.explanation_table_headers);
            const rowsParsed = parseRows(q.explanation_table_rows);
            return headersParsed && rowsParsed ? { headers: headersParsed, rows: rowsParsed } : undefined;
          })();

          return {
            id: q.id,
            text: q.question_text,
            options: [
              { id: 'a', text: q.option_a ?? '' },
              { id: 'b', text: q.option_b ?? '' },
              { id: 'c', text: q.option_c ?? '' },
              { id: 'd', text: q.option_d ?? '' },
              { id: 'e', text: q.option_e ?? '' },
            ].filter(opt => opt.text !== ''),
            answerKey: q.answer_key,
            explanation: q.explanation,
            image: q.image_url || undefined,
            table,
            explanationImage: q.explanation_image_url || undefined,
            explanationTable,
          };
        });

        const aRes = await axios.get<QuizAttemptFromServer>(
          `${API_BASE}/quizattempt/${encodeURIComponent(tryoutId)}/${encodeURIComponent(String(attemptNumber))}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const attemptData = aRes.data;

        let orderedQuestions: Question[] = mapped.slice();
        const answersFromAttempt: Record<number, string> = {};

        if (attemptData && attemptData.question_order) {
          const qOrder = attemptData.question_order
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== '')
            .map(s => Number(s));

          const qMap = new Map<number, Question>();
          mapped.forEach(mq => qMap.set(mq.id, mq));
          orderedQuestions = qOrder.map(id => qMap.get(id)).filter(Boolean) as Question[];

          const { answersMap } = parseAttemptAnswersAndFlags(attemptData);
          Object.assign(answersFromAttempt, answersMap);
        } else {
          orderedQuestions.sort((a, b) => a.id - b.id);
        }

        if (!mounted) return;
        setQuestions(orderedQuestions);
        setAnswers(answersFromAttempt);
        setCurrentAttempt(attemptData);
        setSelectedQuestionId(orderedQuestions[0]?.id ?? null);
        setLoading(false);
      } catch (err) {
        console.error('Load quiz review error:', err);
        setError(err instanceof Error ? err.message : 'Gagal memuat review');
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryoutId, attemptNumber]);

  const correctQuestions = useMemo(() => {
    return questions
      .map((q, idx) => (answers[q.id] === q.answerKey ? idx + 1 : null))
      .filter((x): x is number => x !== null);
  }, [questions, answers]);

  const incorrectQuestions = useMemo(() => {
    return questions
      .map((q, idx) => (answers[q.id] && answers[q.id] !== q.answerKey ? idx + 1 : null))
      .filter((x): x is number => x !== null);
  }, [questions, answers]);

  const stats = useMemo(() => {
    const total = questions.length;
    const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]).length;
    const correctCount = questions.reduce((acc, q) => acc + (answers[q.id] && q.answerKey && answers[q.id] === q.answerKey ? 1 : 0), 0);
    const incorrectCount = Math.max(0, answeredCount - correctCount);
    const unansweredCount = Math.max(0, total - answeredCount);

    let totalSeconds = 0;
    if (currentAttempt) {
      if (currentAttempt.submitted_at && currentAttempt.start_time) {
        totalSeconds = Math.max(0, (new Date(currentAttempt.submitted_at).getTime() - new Date(currentAttempt.start_time).getTime()) / 1000);
      } else if (currentAttempt.start_time) {
        totalSeconds = Math.max(0, (Date.now() - new Date(currentAttempt.start_time).getTime()) / 1000);
      } else if (currentAttempt.duration_minutes) {
        totalSeconds = currentAttempt.duration_minutes * 60;
      }
    }

    const avgSecPerQuestionAll = total > 0 ? totalSeconds / total : 0;
    const avgSecPerAnswered = answeredCount > 0 ? totalSeconds / answeredCount : 0;

    return {
      total,
      answeredCount,
      correctCount,
      incorrectCount,
      unansweredCount,
      totalSeconds,
      avgSecPerQuestionAll,
      avgSecPerAnswered,
    };
  }, [questions, answers, currentAttempt]);

  const formatSec = (sec: number) => {
    if (!isFinite(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const goToPreviousQuestion = (): void => {
    if (selectedQuestionId === null) return;
    const idx = questions.findIndex(q => q.id === selectedQuestionId);
    if (idx > 0) setSelectedQuestionId(questions[idx - 1].id);
  };
  const goToNextQuestion = (): void => {
    if (selectedQuestionId === null) return;
    const idx = questions.findIndex(q => q.id === selectedQuestionId);
    if (idx !== -1 && idx < questions.length - 1) {
      setSelectedQuestionId(questions[idx + 1].id);
    }
  };

  const handleExit = (): void => {
    if (currentAttempt) {
      navigate(`/tryouts?id=${currentAttempt.tryout_id}`);
    } else {
      navigate('/tryouts');
    }
  };

  useEffect(() => {
    if (!showAll || questions.length === 0) return;

    let margin = '0px 0px -50% 0px';
    if (isMobile) margin = '0px 0px -30% 0px';
    else if (isTablet) margin = '0px 0px -40% 0px';
    else if (isLarge) margin = '0px 0px -35% 0px';

    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter(e => e.isIntersecting);
      if (visibleEntries.length === 0) return;

      const closestToTop = visibleEntries.reduce((prev, curr) => {
        return Math.abs(curr.boundingClientRect.top) < Math.abs(prev.boundingClientRect.top)
          ? curr
          : prev;
      });

      const qid = Number((closestToTop.target as HTMLElement).getAttribute('data-qid'));
      if (!isNaN(qid)) setActiveInViewId(qid);
    }, { threshold: 0.1, rootMargin: margin });

    questions.forEach(q => {
      const el = questionRefs.current[q.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [showAll, questions, isMobile, isTablet, isLarge]);

  const handleSelectQuestion = (ordinal: number): void => {
    const q = questions[ordinal - 1];
    if (!q) return;
    if (showAll) {
      questionRefs.current[q.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setSelectedQuestionId(q.id);
    }
  };

  const StatsBox = () => (
    <Card sx={{ mb: 2, borderRadius: 2, boxShadow: 2, backgroundColor: 'white'}}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: themePalette.btnSecondaryText }}>
          Statistik Penyelesaian
        </Typography>

        <Stack
          direction="row"
          spacing={2}
          sx={{
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'space-between' },
            rowGap: 2,
          }}
        >
          <Box textAlign="center" flex={1} minWidth={{ xs: '45%', sm: '120px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Total Soal</Typography>
            <Typography variant="h6" sx={{ color: themePalette.btnSecondaryText }}>{stats.total}</Typography>
          </Box>

          <Box textAlign="center" flex={1} minWidth={{ xs: '45%', sm: '120px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Terjawab</Typography>
            <Typography variant="h6" sx={{ color: themePalette.btnSecondaryText }}>{stats.answeredCount}</Typography>
          </Box>

          <Box textAlign="center" flex={1} minWidth={{ xs: '45%', sm: '120px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Benar</Typography>
            <Typography variant="h6" sx={{ color: 'success.main' }}>{stats.correctCount}</Typography>
          </Box>

          <Box textAlign="center" flex={1} minWidth={{ xs: '45%', sm: '120px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Salah</Typography>
            <Typography variant="h6" sx={{ color: 'error.main' }}>{stats.incorrectCount}</Typography>
          </Box>

          <Box textAlign="center" flex={1} minWidth={{ xs: '45%', sm: '120px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Belum Terjawab</Typography>
            <Typography variant="h6" sx={{ color: themePalette.btnSecondaryText }}>{stats.unansweredCount}</Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack
          direction="row"
          spacing={2}
          sx={{
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'space-between' },
            rowGap: 2,
          }}
        >
          <Box textAlign="center" flex={1} minWidth={{ xs: '90%', sm: '160px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Total Waktu</Typography>
            <Typography variant="body1" sx={{ color: themePalette.btnSecondaryText }}>{formatSec(stats.totalSeconds)}</Typography>
          </Box>

          <Box textAlign="center" flex={1} minWidth={{ xs: '90%', sm: '160px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Rata-rata / soal (semua)</Typography>
            <Typography variant="body1" sx={{ color: themePalette.btnSecondaryText }}>{formatSec(stats.avgSecPerQuestionAll)}</Typography>
          </Box>

          <Box textAlign="center" flex={1} minWidth={{ xs: '90%', sm: '160px' }}>
            <Typography variant="caption" sx={{ color: themePalette.textSecondary }}>Rata-rata / soal (yang dijawab)</Typography>
            <Typography variant="body1" sx={{ color: themePalette.btnSecondaryText }}>{formatSec(stats.avgSecPerAnswered)}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <Stack justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
      <Typography>Loading review...</Typography>
    </Stack>;
  }

  if (error) {
    return <Stack justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
      <Typography color="error">{error}</Typography>
    </Stack>;
  }

  return (
    <Stack
      direction={isMobile ? 'column' : 'row'}
      spacing={4}
      sx={{
        paddingX: '20px',
        mx: 'auto',
        mt: 4,
        pr: { xs: '20px', sm: '360px', md: '440px', lg: '520px', xl: '540px' },
        bgcolor: 'white',
      }}
      alignItems="stretch"
    >
      {isMobile && (
        <Box sx={{ mb: 2, position: 'sticky', top: 20, zIndex: 10 }}>
          <QuizNavigation
            totalQuestions={questions.length}
            selectedQuestion={
              showAll
                ? (() => {
                    const idx = questions.findIndex(q => q.id === (activeInViewId ?? questions[0]?.id));
                    return idx >= 0 ? idx + 1 : 1;
                  })()
                : (() => {
                    const idx = questions.findIndex(q => q.id === selectedQuestionId);
                    return idx >= 0 ? idx + 1 : 1;
                  })()
            }
            onSelectQuestion={handleSelectQuestion}
            showAll={showAll}
            onToggleShowAll={() => setShowAll(prev => !prev)}
            onFontSizeChange={(size) => setFontSize(size)}
            grade={currentAttempt?.grade ?? null}
            correctQuestions={correctQuestions}
            incorrectQuestions={incorrectQuestions}
          />
        </Box>
      )}

      <Box flex={1} width="100%" sx={{ display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={4} sx={{ width: '100%', flexGrow: 1 }}>
          {showAll ? (
            <>
              <StatsBox />
              <QuestionForm
                questions={questions as QCompQuestion[]}
                answers={answers}
                fontSize={fontSize}
                registerQuestionRef={(id, el) => { questionRefs.current[id] = el; }}
                isReview
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleExit}
                sx={{
                  backgroundColor: themePalette.primaryLight,
                  color: themePalette.primaryContrastText,
                  '&:hover': { backgroundColor: themePalette.primaryDark },
                }}
              >
                Keluar
              </Button>
            </>
          ) : (
            <>
              {questions.length > 0 && selectedQuestionId === questions[0].id && <StatsBox />}
              <QuestionForm
                questions={questions as QCompQuestion[]}
                selectedQuestionId={selectedQuestionId ?? undefined}
                answers={answers}
                fontSize={fontSize}
                isReview
              />
            </>
          )}

          {!showAll && (
            <Stack direction="row" pb={'20px'} spacing={2} justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={goToPreviousQuestion}
                disabled={questions.findIndex(q => q.id === selectedQuestionId) <= 0}
                sx={{fontSize:'10px', borderColor: themePalette.primaryDark, color: themePalette.primaryContrastText, bgcolor:themePalette.primaryLight,
                       '&:hover': { backgroundColor: themePalette.primaryDark, borderColor: themePalette.primaryDark },
                    }}>
                Sebelumnya
              </Button>

              <Button
                variant="contained"
                size="large"
                onClick={handleExit}
                sx={{fontSize:'10px', borderColor: themePalette.primaryDark, color: themePalette.primaryContrastText, bgcolor:themePalette.primaryLight,
                       '&:hover': { backgroundColor: themePalette.primaryDark, borderColor: themePalette.primaryDark },
                    }}>
                Keluar
              </Button>

              <Button
                variant="outlined"
                onClick={goToNextQuestion}
                disabled={(() => {
                  const idx = questions.findIndex(q => q.id === selectedQuestionId);
                  return idx === -1 || idx === questions.length - 1;
                })()}
                 sx={{fontSize:'10px', borderColor: themePalette.primary, color: themePalette.primaryContrastText, bgcolor:themePalette.primaryLight,
                       '&:hover': { backgroundColor: themePalette.primaryDark },
                    }}>
                Selanjutnya
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {!isMobile && (
        <Box sx={{ width: { xs: '100%', sm: 320, md: 400, lg: 480, xl: 520 }, position: 'fixed', right: 20, top: { sm: '32px', md: '32px' } }}>
          <QuizNavigation
            totalQuestions={questions.length}
            selectedQuestion={showAll
              ? (() => {
                  const idx = questions.findIndex(q => q.id === (activeInViewId ?? questions[0]?.id));
                  return idx >= 0 ? idx + 1 : 1;
                })()
              : (() => {
                  const idx = questions.findIndex(q => q.id === selectedQuestionId);
                  return idx >= 0 ? idx + 1 : 1;
                })()
            }
            onSelectQuestion={handleSelectQuestion}
            showAll={showAll}
            onToggleShowAll={() => setShowAll(prev => !prev)}
            onFontSizeChange={(size) => setFontSize(size)}
            grade={currentAttempt?.grade ?? null}
            correctQuestions={correctQuestions}
            incorrectQuestions={incorrectQuestions}
          />
        </Box>
      )}
    </Stack>
  );
}
