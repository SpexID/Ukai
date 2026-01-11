// src/pages/AuthPage.tsx
import { useState } from 'react';
import {
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  InputAdornment,
  CircularProgress,
  TextField,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import axios from 'axios';
import bg from '../../assets/logoukai.png';
import { useNavigate } from 'react-router-dom';

type Mode = 'login' | 'register' | 'forgot' | 'verify-register' | 'verify-forgot';

export default function AuthPage(): JSX.Element {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const API_BASE = import.meta.env.VITE_API_BASE;

  const clearMsgs = () => {
    setMessage(null);
    setError(null);
  };

  const validateEmail = (value: string) => value.trim().length > 0;
  const validatePasswordLen = (v: string) => v.length >= 5;

  const friendlyErrorFromAxios = (err: unknown, fallback = 'Terjadi kesalahan') => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const dataErr = err.response?.data?.error || err.response?.data?.message;

      if (status === 401) {
        if (typeof dataErr === 'string') {
          if (dataErr.toLowerCase().includes('user not found') || dataErr.toLowerCase().includes('email')) {
            return 'Email tidak terdaftar';
          }
          if (dataErr.toLowerCase().includes('invalid password') || dataErr.toLowerCase().includes('password')) {
            return 'Password salah';
          }
        }
        return 'Kredensial tidak valid';
      }
      if (status === 403) return (dataErr as string) || 'Akun belum terverifikasi. Cek email Anda.';
      if (status === 404) return (dataErr as string) || 'Data tidak ditemukan';
      if (dataErr) return dataErr as string;
      return `Gagal (${status ?? 'error'})`;
    }
    return fallback;
  };

  // LOGIN
  const handleLogin = async () => {
    clearMsgs();
    if (!validateEmail(email) || !password) {
      setError('Email dan password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/login`, { email, password });
      const { token } = res.data;
      localStorage.setItem('token', token);
      setMessage('Login berhasil — mengalihkan...');
      // ✅ Delay sebelum navigasi agar Alert sempat tampil
      setTimeout(() => navigate('/'), 1000);
    } catch (err: unknown) {
      const friendly = friendlyErrorFromAxios(err, 'Gagal login');
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  // REGISTER step 1 -> send code
  const handleRegister = async () => {
    clearMsgs();
    if (!validateEmail(email) || !validatePasswordLen(password)) {
      setError('Email wajib diisi dan password minimal 5 karakter');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/register`, { email, password, role: 'user' });
      setMessage('Kode verifikasi dikirim. Cek folder spam jika perlu.');
      setMode('verify-register');
    } catch (err: unknown) {
      const friendly = friendlyErrorFromAxios(err, 'Gagal mengirim kode registrasi');
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  // REGISTER verify
  const handleRegisterVerify = async () => {
    clearMsgs();
    if (!code) {
      setError('Masukkan kode verifikasi');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/register/verify`, { email, code });
      const { token } = res.data;
      localStorage.setItem('token', token);
      setMessage('Registrasi berhasil. Anda otomatis login.');
      setTimeout(() => navigate('/'), 1000); // ✅ delay added
    } catch (err: unknown) {
      const friendly = friendlyErrorFromAxios(err, 'Gagal verifikasi registrasi');
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  // FORGOT step 1 send code
  const handleForgotSend = async () => {
    clearMsgs();
    if (!validateEmail(email)) {
      setError('Masukkan email yang terdaftar');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/user/send-code`, { email });
      setMessage('Kode reset dikirim. Cek folder spam jika perlu.');
      setMode('verify-forgot');
    } catch (err: unknown) {
      const friendly = friendlyErrorFromAxios(err, 'Gagal mengirim kode reset');
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  // FORGOT verify -> set new password
  const handleForgotVerify = async () => {
    clearMsgs();
    if (!code || !validatePasswordLen(newPassword)) {
      setError('Kode dan password baru (minimal 5 karakter) wajib diisi');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/user/verify-code`, { email, code, newPassword });
      setMessage('Password berhasil diganti. Silakan login.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setNewPassword('');
        setCode('');
      }, 700);
    } catch (err: unknown) {
      const friendly = friendlyErrorFromAxios(err, 'Gagal mengganti password');
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const isEmailReadOnly = mode === 'verify-register' || mode === 'verify-forgot';

  return (
    <Box
      sx={{
        bgcolor: 'white',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden', // ✅ solusi WebView bug
      }}
    >
      <Grid container sx={{ height: '100vh' }}>
        {/* Panel kiri */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
          }}
        >
          <Stack height="100%" justifyContent="center" alignItems="center">
            <Box
              sx={{
                borderRadius: 4,
                boxShadow: 6,
                background: 'transparent',
              }}
            >
              <img
                src={bg}
                alt="logo"
                style={{
                  maxWidth: 400,
                  width: '100%',
                  borderRadius: '12px',
                  display: 'block',
                }}
              />
            </Box>
          </Stack>
        </Grid>

        {/* Panel kanan */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}
        >
          <Box sx={{ width: '100%', maxWidth: 520 }}>
            <Stack spacing={3}>
              <Stack>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {mode === 'login' && 'Masuk'}
                  {mode === 'register' && 'Daftar'}
                  {mode === 'forgot' && 'Lupa Password'}
                  {mode === 'verify-register' && 'Verifikasi Registrasi'}
                  {mode === 'verify-forgot' && 'Reset Password'}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ color: 'text.secondary', fontWeight: 500 }}
                >
                  {mode === 'login' && 'Selamat datang di Rumah Ukai'}
                  {mode === 'register' && 'Isi email & password untuk membuat akun'}
                  {mode === 'forgot' && 'Masukkan email untuk menerima kode reset'}
                  {mode === 'verify-register' &&
                    'Masukkan kode verifikasi yang dikirim ke email Anda'}
                  {mode === 'verify-forgot' &&
                    'Masukkan kode dan password baru (email tidak dapat diubah)'}
                </Typography>
              </Stack>

              {/* ✅ Kondisi aman untuk Alert agar tidak crash */}
              <Stack spacing={1}>
                {message && (
                  <Alert key="success-alert" severity="success">
                    {message}
                  </Alert>
                )}
                {error && (
                  <Alert key="error-alert" severity="error">
                    {error}
                  </Alert>
                )}
              </Stack>
              {/* FORM */}
              <Stack spacing={2}>
                {/* Email always shown but readonly in verify modes */}
                <TextField
                  label="Email"
                  sx={{
                    input: { color: '#000' },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#000',
                      opacity: 0.6,
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#000' },
                      '&:hover fieldset': { borderColor: '#000' },
                      '&.Mui-focused fieldset': { borderColor: '#000' },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#000',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#000',
                    },
                    // fix autofill
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px #fff inset',
                      WebkitTextFillColor: '#000',
                      caretColor: '#000',
                    },
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  size="medium"
                  InputProps={{
                    readOnly: isEmailReadOnly,
                  }}
                />

                {/* Login & Register password */}
                {(mode === 'login' || mode === 'register') && (
                  <TextField
                    label="Password"
                    sx={{
                      input: { color: '#000' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#000' },
                        '&:hover fieldset': { borderColor: '#000' },
                        '&.Mui-focused fieldset': { borderColor: '#000' },
                        '& input:-webkit-autofill': {
                          WebkitBoxShadow: '0 0 0 1000px #fff inset',
                          WebkitTextFillColor: '#000',
                          transition: 'background-color 5000s ease-in-out 0s',
                        },
                      },
                      '& .MuiInputLabel-root': { color: '#000' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#000' },
                    }}
                    type={'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end"></InputAdornment>
                      ),
                    }}
                    FormHelperTextProps={{
                      sx: { color: '#000' }, // helperText hitam
                    }}
                    helperText={mode === 'register' ? 'Password minimal 5 karakter' : undefined}
                    error={mode === 'register' && password.length > 0 && !validatePasswordLen(password)}
                  />
                )}

                {/* Verify / forgot fields */}
                {mode === 'verify-register' && (
                  <TextField
                    label="Kode verifikasi"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    fullWidth
                    sx={{
                      input: { color: '#000' },
                      '& .MuiInputBase-input::placeholder': {
                        color: '#000',
                        opacity: 0.6,
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#000' },
                        '&:hover fieldset': { borderColor: '#000' },
                        '&.Mui-focused fieldset': { borderColor: '#000' },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#000',
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#000',
                      },
                      '& input:-webkit-autofill': {
                        WebkitBoxShadow: '0 0 0 1000px #fff inset',
                        WebkitTextFillColor: '#000',
                        caretColor: '#000',
                      },
                    }}
                    helperText="Masukkan kode 6-digit yang dikirim ke email Anda"
                  />
                )}

                {mode === 'verify-forgot' && (
                  <>
                    <TextField
                      sx={{
                        input: { color: '#000' },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#000' },
                          '&:hover fieldset': { borderColor: '#000' },
                          '&.Mui-focused fieldset': { borderColor: '#000' },
                          '& input:-webkit-autofill': {
                            WebkitBoxShadow: '0 0 0 1000px #fff inset',
                            WebkitTextFillColor: '#000',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#000',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#000',
                        },
                      }}
                      label="Kode verifikasi"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Password baru"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      fullWidth
                      sx={{
                        input: { color: '#000' },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#000' },
                          '&:hover fieldset': { borderColor: '#000' },
                          '&.Mui-focused fieldset': { borderColor: '#000' },
                          '& input:-webkit-autofill': {
                            WebkitBoxShadow: '0 0 0 1000px #fff inset',
                            WebkitTextFillColor: '#000',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#000',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#000',
                        },
                      }}
                      helperText="Minimal 5 karakter"
                      error={newPassword.length > 0 && !validatePasswordLen(newPassword)}
                    />
                  </>
                )}
              </Stack>

              {/* ACTION BUTTONS */}
              <Stack
                direction="row"
                spacing={isMobile ? 0 : 2}
                alignItems="center"
                flexWrap="wrap"
              >
                {mode === 'login' && (
                  <>
                    <Button
                      onClick={handleLogin}
                      disabled={loading}
                      sx={{
                        px: 4,
                        bgcolor: '#462011',
                        color: 'white',
                        '&:hover': { bgcolor: '#5a2a17' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Masuk'}
                    </Button>
                    <Button
                      onClick={() => {
                        clearMsgs();
                        setMode('forgot');
                      }}
                      sx={{
                        color: '#000',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      Lupa Password
                    </Button>
                    <Button
                      onClick={() => {
                        clearMsgs();
                        setMode('register');
                      }}
                      sx={{
                        color: '#000',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      Registrasi
                    </Button>
                  </>
                )}

                {mode === 'register' && (
                  <>
                    <Button
                      onClick={handleRegister}
                      disabled={loading}
                      sx={{
                        px: 4,
                        bgcolor: '#462011',
                        color: 'white',
                        '&:hover': { bgcolor: '#5a2a17' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Kirim Kode (Daftar)'}
                    </Button>
                    <Button
                      onClick={() => {
                        clearMsgs();
                        setMode('login');
                      }}
                      sx={{
                        color: '#000',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      Kembali ke Login
                    </Button>
                  </>
                )}

                {mode === 'verify-register' && (
                  <>
                    <Button
                      onClick={handleRegisterVerify}
                      disabled={loading}
                      sx={{
                        bgcolor: '#462011',
                        color: 'white',
                        '&:hover': { bgcolor: '#5a2a17' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Verifikasi & Masuk'}
                    </Button>
                    <Button
                      onClick={() => {
                        clearMsgs();
                        setMode('register');
                      }}
                      sx={{
                        color: '#000',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      Kembali
                    </Button>
                  </>
                )}

                {mode === 'forgot' && (
                  <>
                    <Button
                      onClick={handleForgotSend}
                      disabled={loading}
                      sx={{
                        bgcolor: '#462011',
                        color: 'white',
                        '&:hover': { bgcolor: '#5a2a17' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Kirim Kode'}
                    </Button>
                    <Button
                      onClick={() => {
                        clearMsgs();
                        setMode('login');
                      }}
                      sx={{
                        color: '#000',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      Kembali
                    </Button>
                  </>
                )}

                {mode === 'verify-forgot' && (
                  <>
                    <Button
                      onClick={handleForgotVerify}
                      disabled={loading}
                      sx={{
                        bgcolor: '#462011',
                        color: 'white',
                        '&:hover': { bgcolor: '#5a2a17' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Ganti Password'}
                    </Button>
                    <Button
                      onClick={() => {
                        clearMsgs();
                        setMode('login');
                      }}
                      sx={{
                        color: '#000',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      Kembali
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
