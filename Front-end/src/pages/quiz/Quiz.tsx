/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/Quiz/Quiz.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Stack,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Typography,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QuestionForm, { Question as QCompQuestion } from '../../components/beranda/soal';
import QuizNavigation from '../../components/beranda/soalnav';
import { tokensSet } from '../../theme/tokens';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// di dalam komponen Quiz

export default function Quiz(): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLaptop = useMediaQuery(theme.breakpoints.between('md', 'lg'));
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

  const initialAttempt = attemptFromState ?? (attemptQuery ? Number(attemptQuery) : null);
  const [attemptNumberState, setAttemptNumberState] = useState<number | null>(initialAttempt);

  interface Question {
    id: number;
    text: string;
    options: { id: string; text: string }[];
    answerKey?: string;
    explanation?: string;
    image?: string;
    table?: {
      headers: string[];
      rows: string[][];
    };
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
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // theme palette from DB (tokens)
  const [themePalette, setThemePalette] = useState(tokensSet.palette1);

  // states untuk konfirmasi submit
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState<number>(0);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [activeInViewId, setActiveInViewId] = useState<number | null>(null);
document.body.style.backgroundColor = 'white';
document.documentElement.style.backgroundColor ='white';
  const parseHeaders = (headers?: string[] | string | null): string[] | undefined => {
    if (!headers) return undefined;
    if (Array.isArray(headers)) return headers;
    return headers.split('|').map(h => h.trim());
  };

  const parseRows = (rows?: string[][] | string | null): string[][] | undefined => {
    if (!rows) return undefined;
    if (Array.isArray(rows)) return rows as string[][];
    return rows
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

  // ambil tema user dari DB supaya bisa dipakai untuk styling lokal di halaman Quiz
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // server /user returns user object; expect `tema` field (e.g. 'palette1')
        if (res.data?.tema && typeof res.data.tema === 'string' && (res.data.tema as keyof typeof tokensSet) in tokensSet) {
          setThemePalette(tokensSet[res.data.tema as keyof typeof tokensSet]);
        }
      } catch (err) {
        // fail silently and keep default palette
        // console.error('Failed to fetch user theme', err);
      }
    };
    void fetchTheme();
  }, []);
 useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = themePalette.primary;
    document.documentElement.style.backgroundColor = themePalette.primary;
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
    };
  }, [themePalette.surface]);
  useEffect(() => {
    
    let mounted = true;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Token tidak ditemukan. Silakan login.');
        if (!tryoutId) throw new Error('tryoutId tidak diberikan (query string atau state).');

        const qRes = await axios.get<ServerQuestion[]>(
          `${API_BASE}/questions?tryoutId=${encodeURIComponent(tryoutId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!mounted) return;
        const serverQuestions = Array.isArray(qRes.data) ? qRes.data : [];
        const mapped: Question[] = serverQuestions.map((q) => ({
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
          table: (() => {
            const headersParsed = parseHeaders(q.table_headers);
            const rowsParsed = parseRows(q.table_rows);
            return headersParsed && rowsParsed ? { headers: headersParsed, rows: rowsParsed } : undefined;
          })(),
        }));

        let attemptData: QuizAttemptFromServer | null = null;

        if (!attemptNumberState) {
          const startRes = await axios.post(
            `${API_BASE}/quizattempt/start`,
            { tryout_id: tryoutId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          attemptData = startRes.data as QuizAttemptFromServer;
          if (!mounted) return;
          setCurrentAttempt(attemptData);
          setAttemptNumberState(attemptData.attempt_number);
        } else {
          const aRes = await axios.get<QuizAttemptFromServer>(
            `${API_BASE}/quizattempt/${encodeURIComponent(tryoutId)}/${encodeURIComponent(String(attemptNumberState))}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          attemptData = aRes.data as QuizAttemptFromServer;
          if (!mounted) return;
          setCurrentAttempt(attemptData);
        }

        // Jika attempt sudah "finished", langsung arahkan ke halaman review
        if (attemptData && attemptData.status === 'finished') {
          // navigasi ke review dengan tryoutId dan attempt number
          navigate(
            `/review?tryoutId=${encodeURIComponent(attemptData.tryout_id)}&attempt=${encodeURIComponent(String(attemptData.attempt_number))}`
          );
          return;
        }

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

          const { answersMap, flaggedIds } = parseAttemptAnswersAndFlags(attemptData);
          Object.assign(answersFromAttempt, answersMap);
          if (mounted) setFlaggedQuestions(flaggedIds);
        } else {
          orderedQuestions.sort((a, b) => a.id - b.id);
        }

        if (!mounted) return;
        setQuestions(orderedQuestions);
        setAnswers(answersFromAttempt);
        setSelectedQuestionId(orderedQuestions.length > 0 ? orderedQuestions[0].id : null);
        setLoading(false);
      } catch (err) {
        console.error('Load quiz error:', err);
        setError(err instanceof Error ? err.message : 'Gagal memuat quiz');
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryoutId, attemptNumberState, navigate]);

  const handleAnswerChange = async (questionId: number, answerId: string): Promise<void> => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    if (!currentAttempt) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const qOrder = currentAttempt.question_order
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => Number(s));

    const ansArr = currentAttempt.answer_order && currentAttempt.answer_order.trim() !== ''
      ? currentAttempt.answer_order.split(',').map(s => s.trim())
      : qOrder.map(() => '-');

    const idx = qOrder.findIndex(qid => qid === questionId);
    if (idx === -1) return;
    const hasFlag = ansArr[idx]?.includes('f') ?? false;
    ansArr[idx] = (answerId || '-').toString() + (hasFlag ? 'f' : '');
    const updatedAnswerOrder = ansArr.join(',');

    try {
      const res = await axios.patch(
        `${API_BASE}/quizattempt/${encodeURIComponent(currentAttempt.tryout_id)}/${encodeURIComponent(String(currentAttempt.attempt_number))}`,
        { answer_order: updatedAnswerOrder },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 200 && res.data) {
        const srv = res.data as QuizAttemptFromServer;
        setCurrentAttempt(srv);
        const { answersMap, flaggedIds } = parseAttemptAnswersAndFlags(srv);
        setAnswers(answersMap);
        setFlaggedQuestions(flaggedIds);
      }
    } catch (err) {
      console.error('Gagal update jawaban:', err);
    }
  };

  const handleToggleFlag = async (questionId: number): Promise<void> => {
    const willBeFlagged = !flaggedQuestions.includes(questionId);
    setFlaggedQuestions(prev => (willBeFlagged ? Array.from(new Set([...prev, questionId])) : prev.filter(id => id !== questionId)));
    let optimisticAnsArr: string[] | null = null;
    if (currentAttempt) {
      const qOrder = currentAttempt.question_order.split(',').map(s => Number(s));
      const ansArr = (currentAttempt.answer_order || '').split(',');
      while (ansArr.length < qOrder.length) ansArr.push('-');
      const idx = qOrder.indexOf(questionId);
      if (idx !== -1) {
        const currentAns = ansArr[idx] || '-';
        const cleaned = currentAns.replace(/f/g, '');
        ansArr[idx] = (cleaned === '-' ? '' : cleaned) + (willBeFlagged ? 'f' : '');
      }
      optimisticAnsArr = ansArr;
      setCurrentAttempt(prev => prev ? { ...prev, answer_order: ansArr.join(',') } : prev);
    }
    try {
      const token = localStorage.getItem('token');
      if (!token || !currentAttempt) return;
      const patchBody = { answer_order: optimisticAnsArr ? optimisticAnsArr.join(',') : currentAttempt.answer_order };
      const res = await axios.patch(
        `${API_BASE}/quizattempt/${encodeURIComponent(currentAttempt.tryout_id)}/${encodeURIComponent(String(currentAttempt.attempt_number))}`,
        patchBody,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 200 && res.data) {
        const srv = res.data as QuizAttemptFromServer;
        setCurrentAttempt(srv);
        const { answersMap, flaggedIds } = parseAttemptAnswersAndFlags(srv);
        setAnswers(answersMap);
        setFlaggedQuestions(flaggedIds);
      }
    } catch (err) {
      console.error('Gagal sync flag ke backend:', err);
    }
  };

  // fungsi finalisasi (tetap pakai handleFinalizeAttempt yang sudah ada)
  const handleFinalizeAttempt = async (): Promise<void> => {
    if (!currentAttempt) return;
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Silakan login terlebih dahulu');
      return;
    }
    try {
      const total = questions.length || 1;
      const correctCount = questions.reduce((acc, q) => {
        const ua = (answers[q.id] || '').toLowerCase();
        return acc + (q.answerKey && ua === q.answerKey ? 1 : 0);
      }, 0);
      const percent = (correctCount / total) * 100;
      const gradeStr = percent.toFixed(2);

      const qOrder = currentAttempt.question_order
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(s => Number(s));

      const ansArrToSend = qOrder.map((qid) => {
        const a = (answers[qid] || '-').toString().trim().toLowerCase();
        const letter = /^[a-e]$/.test(a) ? a : '-';
        const withFlag =
          flaggedQuestions.includes(qid) && letter !== '-'
            ? `${letter}f`
            : flaggedQuestions.includes(qid) && letter === '-'
            ? `f`
            : letter;
        return withFlag;
      });

      const body = {
        status: 'finished',
        submitted_at: new Date().toISOString(),
        grade: gradeStr,
        answer_order: ansArrToSend.join(','),
      };

      const res = await axios.patch(
        `${API_BASE}/quizattempt/${encodeURIComponent(currentAttempt.tryout_id)}/${encodeURIComponent(String(currentAttempt.attempt_number))}`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 200 && res.data) {
        const updatedAttempt = res.data as QuizAttemptFromServer;
        setCurrentAttempt(updatedAttempt);

        // ✅ Navigasi ke URL dengan query param
        navigate(
          `/review?tryoutId=${encodeURIComponent(updatedAttempt.tryout_id)}&attempt=${encodeURIComponent(
            String(updatedAttempt.attempt_number)
          )}`
        );
      } else {
        // fallback
        navigate(
          `/review?tryoutId=${encodeURIComponent(currentAttempt.tryout_id)}&attempt=${encodeURIComponent(
            String(currentAttempt.attempt_number)
          )}`
        );
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Gagal finalize attempt:', err);
      if (err?.response?.status === 404) {
        alert('Finalize gagal: endpoint tidak ditemukan (404). Silakan periksa server.');
      } else {
        alert('Gagal finalisasi attempt');
      }
    }
  };

  // wrapper untuk membuka konfirmasi submit — ini dipanggil dari tombol Submit
  const openFinalizeConfirmation = (): void => {
    const total = questions.length;
    const answeredCountLocal = Object.keys(answers).filter(k => answers[Number(k)]).length;
    const notAnswered = Math.max(0, total - answeredCountLocal);
    setUnansweredCount(notAnswered);
    setConfirmOpen(true);
  };

  const confirmFinalize = async (): Promise<void> => {
    setConfirmOpen(false);
    setIsFinalizing(true);
    try {
      await handleFinalizeAttempt();
    } finally {
      setIsFinalizing(false);
    }
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

  useEffect(() => {
    if (!showAll || questions.length === 0) return;
    let margin = '-50px 0px -40% 0px';
    if (isMobile) margin = '-60px 0px -23% 0px';
    else if (isTablet) margin = '-60px 0px -43% 0px';
    else if (isLarge) margin = '-60px 0px -30% 0px';
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target) {
        const idAttr = (visible.target as HTMLElement).getAttribute('data-qid');
        const qid = idAttr ? Number(idAttr) : NaN;
        if (!Number.isNaN(qid)) setActiveInViewId(qid);
      }
    }, { root: null, threshold: 0.5, rootMargin: margin });
    questions.forEach(q => {
      const el = questionRefs.current[q.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [showAll, questions, isMobile, isTablet, isLaptop, isLarge]);

  const handleSelectQuestion = (ordinal: number): void => {
    const idx = ordinal - 1;
    const q = questions[idx];
    if (!q) return;
    if (showAll) {
      const target = questionRefs.current[q.id];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setSelectedQuestionId(q.id);
    }
  };

  // ... encouragementVariants dan semua logic progress tetap sama ...
  const encouragementVariants: Record<string, Record<number, string>> = {
    serius: {
    0: 'Fokus, perjalanan baru saja dimulai.',
    20: 'Teruskan dengan konsisten, hasil akan mengikuti.',
    40: 'Kamu sudah hampir setengah jalan, tetap tenang.',
    60: 'Kerja kerasmu terlihat, jangan kendur.',
    80: 'Sedikit lagi, jangan sia-siakan usahamu.',
    100: 'Selesai. Hasilmu adalah cerminan dari ketekunanmu.',
  },
  playful: {
    0: 'Yuhuu! Baru mulai, seru nih!',
    20: 'Mantap, mesin sudah panas nih 😎',
    40: 'Setengah jalan lagi dong, keep it fun!',
    60: 'Gokil, lebih dari setengah! 🚀',
    80: 'Tinggal secuil, gas terus!',
    100: 'Boom! Kamu berhasil 🎉',
  },
  game: {
    0: 'Level 1 unlocked, siap berpetualang!',
    20: 'XP +20%, karakter makin kuat!',
    40: 'Setengah stage clear, power up!',
    60: 'Boss stage sebentar lagi!',
    80: 'Final battle tinggal sedikit lagi!',
    100: 'Victory Royale! 🏆',
  },
  genZ: {
    0: 'Gaskeun, baru mulai ni guys 😎',
    20: 'Anjay, udah lumayan nih!',
    40: 'Wihh, setengah jalan dong!',
    60: 'Udah jauh banget, jangan nyerah!',
    80: 'Sisa dikit lagi bro, fokus!',
    100: 'GG gaming, tamat! 🔥',
  },
  chill: {
    0: 'Santai aja, baru pemanasan kok.',
    20: 'Nice, udah mulai dapet ritme.',
    40: 'Separuh jalan udah lewat, gampang lah.',
    60: 'Sip, udah lebih dari setengah.',
    80: 'Nyantai aja, tinggal dikit.',
    100: 'Beress, good job ✨',
  },
  anime: {
    0: 'Petualanganmu baru dimulai, nakama! ⚔️',
    20: 'Kekuatanmu meningkat, jangan berhenti sekarang!',
    40: 'Kamu sudah setengah jalan, percaya pada takdirmu!',
    60: 'Semangatmu membara seperti api ninjaku! 🔥',
    80: 'Final arc sebentar lagi, bersiaplah!',
    100: 'Kamu pahlawan sejati, arc ini tamat 🎉',
  },
  romantis: {
    0: 'Awal yang indah, seperti pertemuan pertama kita 💖',
    20: 'Sedikit demi sedikit, hatiku semakin kagum.',
    40: 'Kamu sudah sejauh ini, aku bangga.',
    60: 'Semangatmu bikin aku makin jatuh hati 💕',
    80: 'Nyaris sampai, cintaku jadi energi tambahanmu.',
    100: 'Sempurna! Kamu dan perjuanganmu bikin aku tersenyum.',
  },
  islami: {
    0: 'Bismillah, setiap awal niatkan karena Allah.',
    20: 'Teruslah berusaha, Allah melihat ikhtiarmu.',
    40: 'Setengah perjalanan, jangan lupa berdoa.',
    60: 'Kesabaran adalah kunci, kamu hampir sampai.',
    80: 'Sedikit lagi, yakinlah pertolongan Allah dekat.',
    100: 'Alhamdulillah, selesai dengan penuh perjuangan.',
  },
  dark: {
    0: 'Baru mulai? Tenang, penderitaan baru dimulai 😈',
    20: 'Lumayan, tapi jangan terlalu percaya diri.',
    40: 'Setengah jalan, jangan pikir bisa kabur.',
    60: 'Masih hidup? Hebat juga kamu.',
    80: 'Nyaris selesai, tapi jangan lega dulu.',
    100: 'Akhirnya… selesai. Tapi apakah benar-benar berakhir? 👁️',
  },
  inspirasi: {
    0: 'Perjalanan panjang selalu dimulai dari satu langkah.',
    20: 'Ketekunanmu adalah cahaya di awal gelap.',
    40: 'Setengah jalan, bukti nyata kerja kerasmu.',
    60: 'Kamu sedang membuktikan dirimu lebih kuat dari kemarin.',
    80: 'Hampir sampai, jangan berhenti sekarang.',
    100: 'Luar biasa! Kamu sudah menuntaskan perjalananmu.',
  },
    pantun: {
    0: 'Jalan-jalan ke kota Blitar, Quiz dimulai ayo semangat belajar ✨',
    20: 'Pergi ke pasar membeli ikan, Baru 20% jangan cepat tinggalkan 🐟',
    40: 'Naik perahu di tengah lautan, 40% tercapai, lanjutkan perjuangan 🚤',
    60: 'Petik mangga rasanya manis, 60% sudah, makin dekat dengan finis 🥭',
    80: 'Bunga mekar indah di taman, 80% tercapai, sebentar lagi kemenangan 🌸',
    100: 'Burung nuri hinggap di dahan, Quiz selesai, selamat atas keberhasilan 🎉',
  },
    quotes_filosof: {
    0: 'The journey of a thousand miles begins with a single step. — Lao Tzu',
    20: 'Be the change that you wish to see in the world. — Mahatma Gandhi',
    40: 'Life can only be understood backwards; but it must be lived forwards. — Søren Kierkegaard',
    60: 'Experience without theory is blind, but theory without experience is mere intellectual play. — Immanuel Kant',
    80: 'Put your heart, mind, and soul into even your smallest acts. This is the secret of success. — Swami Sivananda',
    100: 'No one saves us but ourselves. We ourselves must walk the path. — Buddha',
  },
    survivor_puncak: {
    0: 'Hidup itu seperti gunung: berat didaki, tapi pemandangannya luar biasa saat sampai puncak.',
  20: 'Semakin tinggi kau mendaki, semakin kecil masalah yang kau lihat.',
  40: 'Tak perlu mendaki hanya untuk menanam bendera, tapi untuk merasakan tantangannya.',
  60: 'Semua kebahagiaan dan pertumbuhan terjadi saat kau menaiki jalannya, bukan hanya di puncak.',
  80: 'Tak ada gunung yang terlalu tinggi bila semangatmu juga besar.',
  100: 'Puncak bukan tujuan semata, tapi bukti bahwa kau mampu melewati setiap tanjakan.',
  },
    heroik_lotr: {
     0: 'I can do this all day.',
  20: 'The hardest choices require the strongest wills.',
  40: 'It’s not enough to be against something. You have to be for something better.',
  60: 'No man can win every battle, but no man should fall without a struggle.',
  80: 'Part of the journey is the end.',
  100: 'It’s not about how much we lost. It’s about how much we have left.',
  },
  game_quote: {
    0: 'It’s dangerous to go alone! Take this.',
  20: 'Stay awhile and listen!',
  40: 'The cake is a lie.',
  60: 'Do a barrel roll!',
  80: 'Endure and survive.',
  100: 'FINISH HIM!'
},
  };

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]).length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const [selectedVariant] = useState(() => {
    const keys = Object.keys(encouragementVariants);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return randomKey;
  });
  const currentMessage = (() => {
    const messages = encouragementVariants[selectedVariant];
    if (progressPercent >= 100) return messages[100];
    if (progressPercent >= 80) return messages[80];
    if (progressPercent >= 60) return messages[60];
    if (progressPercent >= 40) return messages[40];
    if (progressPercent >= 20) return messages[20];
    return messages[0];
  })();

  if (loading) {
    return (
      <Stack justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <Typography>Loading soal...</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <Typography color="error">{error}</Typography>
      </Stack>
    );
  }

  return (
    <>
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={4}
        // height={'100%'}
        sx={{
          paddingX: '20px',
          mx: 'auto',
          pt: 4,
          pr: {
            xs: '20px',
            sm: '360px',
            md: '440px',
            lg: '520px',
            xl: '560px',
          },
          bgcolor:'white'
        }}
        alignItems="stretch"
      >
        {isMobile && (
          <Box sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 10 }}>
            <QuizNavigation
              totalQuestions={questions.length}
              selectedQuestion={
                showAll
                  ? (() => {
                      if (!questions.length) return 1;
                      const idx = questions.findIndex(
                        q => q.id === (activeInViewId ?? questions[0].id)
                      );
                      return idx >= 0 ? idx + 1 : 1;
                    })()
                  : (() => {
                      const idx = questions.findIndex(q => q.id === selectedQuestionId);
                      return idx >= 0 ? idx + 1 : 1;
                    })()
              }
              onSelectQuestion={handleSelectQuestion}
              answeredQuestions={questions
                .map((q, idx) => (answers[q.id] ? idx + 1 : -1))
                .filter(n => n !== -1)}
              flaggedQuestions={flaggedQuestions.map(fid => {
                const idx = questions.findIndex(q => q.id === fid);
                return idx + 1;
              })}
              onToggleFlag={(idNumOrder: number) => {
                const idx = idNumOrder - 1;
                const q = questions[idx];
                if (q) void handleToggleFlag(q.id);
              }}
              showAll={showAll}
              onToggleShowAll={() => setShowAll(prev => !prev)}
              onTimeUp={openFinalizeConfirmation}
              onFontSizeChange={(size) => setFontSize(size)}
              startTime={currentAttempt?.start_time ?? ''}
              durationMinutes={currentAttempt?.duration_minutes ?? 0}
            />
          </Box>
        )}

        <Box flex={1} width="100%" sx={{ display: 'flex', flexDirection: 'column' }}>
          <Stack spacing={4} sx={{ width: '100%', flexGrow: 1,pb:'250px' }}>
            {showAll ? (
              <>
                <QuestionForm
                  questions={questions as QCompQuestion[]}
                  answers={answers}
                  onAnswerChange={(qid: number, aid: string) => { void handleAnswerChange(qid, aid); }}
                  flaggedQuestions={flaggedQuestions}
                  onToggleFlag={(qid: number) => { void handleToggleFlag(qid); }}
                  fontSize={fontSize}
                  currentAttemptId={{
                    tryoutId: tryoutId ?? '',
                    attemptNumber: attemptNumberState ?? 0,
                  }}
                  registerQuestionRef={(id: number, el: HTMLDivElement | null) => {
                    questionRefs.current[id] = el;
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: themePalette.primary,
                    color: themePalette.primaryContrastText,
                    '&:hover': { backgroundColor: themePalette.primaryDark },
                  }}
                  onClick={openFinalizeConfirmation}
                >
                  Submit
                </Button>
              </>
            ) : (
              <>
                <QuestionForm
                  questions={questions as QCompQuestion[]}
                  selectedQuestionId={selectedQuestionId ?? undefined}
                  answers={answers}
                  onAnswerChange={(qid: number, aid: string) => { void handleAnswerChange(qid, aid); }}
                  flaggedQuestions={flaggedQuestions}
                  onToggleFlag={(qid: number) => { void handleToggleFlag(qid); }}
                  fontSize={fontSize}
                  currentAttemptId={{
                    tryoutId: tryoutId ?? '',
                    attemptNumber: attemptNumberState ?? 0,
                  }}
                />
                <Stack direction="row" spacing={2} justifyContent="space-between">
                  <Button
                    variant="contained"
                    onClick={goToPreviousQuestion}
                    disabled={questions.findIndex(q => q.id === selectedQuestionId) <= 0}
                 sx={{fontSize:'10px', borderColor: themePalette.primary, color: themePalette.primaryContrastText, bgcolor:themePalette.primaryLight,
                       '&:hover': { backgroundColor: themePalette.primaryDark },
                    }}>
                    Sebelumnya
                  </Button>
                  {questions.findIndex(q => q.id === selectedQuestionId) === questions.length - 1 && (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={openFinalizeConfirmation}
                      sx={{
                        fontSize:'12px',
                        backgroundColor: themePalette.primaryLight,
                        color: themePalette.primaryContrastText,
                        '&:hover': { backgroundColor: themePalette.primaryDark },
                      }}
                    >
                      Submit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={goToNextQuestion}
                    disabled={(() => {
                      const idx = questions.findIndex(q => q.id === selectedQuestionId);
                      return idx === -1 || idx === questions.length - 1;
                    })()}
                    sx={{fontSize:'10px', borderColor: themePalette.primary, color: themePalette.primaryContrastText, bgcolor:themePalette.primaryLight,
                       '&:hover': { backgroundColor: themePalette.primaryDark },
                    }}
                  >
                    Selanjutnya
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Box>

        {!isMobile && (
          <Box
            sx={{
              width: { xs: '100%', sm: 320, md: 400, lg: 480, xl: 520 },
              position: 'fixed',
              right: 20,
              top: { sm: '32px', md: '32px' },
              height: 'auto',
              flexShrink: 0,
            }}
          >
            <QuizNavigation
              totalQuestions={questions.length}
              selectedQuestion={
                showAll
                  ? (() => {
                      if (!questions.length) return 1;
                      const idx = questions.findIndex(
                        q => q.id === (activeInViewId ?? questions[0].id)
                      );
                      return idx >= 0 ? idx + 1 : 1;
                    })()
                  : (() => {
                      const idx = questions.findIndex(q => q.id === selectedQuestionId);
                      return idx >= 0 ? idx + 1 : 1;
                    })()
              }
              onSelectQuestion={handleSelectQuestion}
              answeredQuestions={questions
                .map((q, idx) => (answers[q.id] ? idx + 1 : -1))
                .filter(n => n !== -1)}
              flaggedQuestions={flaggedQuestions.map(fid => {
                const idx = questions.findIndex(q => q.id === fid);
                return idx + 1;
              })}
              onToggleFlag={(idNumOrder: number) => {
                const idx = idNumOrder - 1;
                const q = questions[idx];
                if (q) void handleToggleFlag(q.id);
              }}
              showAll={showAll}
              onToggleShowAll={() => setShowAll(prev => !prev)}
              onTimeUp={openFinalizeConfirmation}
              onFontSizeChange={(size) => setFontSize(size)}
              startTime={currentAttempt?.start_time ?? ''}
              durationMinutes={currentAttempt?.duration_minutes ?? 0}
            />
          </Box>
        )}
      </Stack>

      
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            bgcolor: 'white',
            p: 1,
            zIndex: 20,
          }}
        >
          <Typography
            variant="body2"
            align="center"
            sx={{ mb: 0.5, fontWeight: 'bold', color: themePalette.btnSecondaryText }}
          >
            {currentMessage}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: themePalette.surface,
              '& .MuiLinearProgress-bar': {
                bgcolor: themePalette.primaryDark,
              },
            }}
          />
          <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5, color: themePalette.textSecondary }}>
            {`${Math.round(progressPercent)}% terjawab`}
          </Typography>
        </Box>
 

      {/* Dialog konfirmasi finalisasi */}
      <Dialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  aria-labelledby="confirm-finalize-dialog"
  PaperProps={{
    elevation: 12, // lebih tinggi untuk efek “terangkat”
  
  }}
>
  <DialogTitle
    id="confirm-finalize-dialog"
    sx={{
      backgroundColor: themePalette.error,
      color: themePalette.primaryContrastText,
      fontWeight: 'bold',
    }}
  >
    Konfirmasi Penyelesaian Ujian
  </DialogTitle>
  <DialogContent sx={{ backgroundColor: themePalette.primaryContrastText }}>
    <DialogContentText sx={{ color: themePalette.btnSecondaryText }}>
      {unansweredCount === 0 ? (
        <>Kamu telah menjawab semua pertanyaan. Apakah kamu yakin ingin menyelesaikan ujian dan melakukan finalisasi?</>
      ) : (
        <>
          Terdapat <strong>{unansweredCount}</strong> soal yang belum terjawab. Jika kamu melanjutkan, soal tersebut akan dianggap belum terjawab. Apakah kamu yakin ingin menyelesaikan ujian?
        </>
      )}
    </DialogContentText>
  </DialogContent>
  <DialogActions sx={{ backgroundColor: themePalette.primaryContrastText }}>
    <Button onClick={() => setConfirmOpen(false)} disabled={isFinalizing} sx={{ color: themePalette.btnSecondaryText }}>
      Batal
    </Button>
    <Button
      onClick={() => { void confirmFinalize(); }}
      variant="contained"
      disabled={isFinalizing}
      sx={{
        backgroundColor: themePalette.primaryDark,
        color: themePalette.primaryContrastText,
        '&:hover': { backgroundColor: themePalette.primaryLight },
      }}
    >
      {isFinalizing ? 'Memproses...' : 'Ya, lanjutkan'}
    </Button>
  </DialogActions>
</Dialog>

    </>
  );
}
