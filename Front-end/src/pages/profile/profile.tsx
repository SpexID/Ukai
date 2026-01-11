// src/pages/Profile/Profile.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Snackbar,
  Stack,
  CircularProgress,

  InputAdornment,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';
import foto1 from '../../assets/fotouser/foto1.png';
import foto2 from '../../assets/fotouser/foto2.png';
import foto3 from '../../assets/fotouser/foto3.png';

const FOTO_MAP: Record<string, string> = { foto1, foto2, foto3 };
const AVAILABLE_PHOTOS = [
  { key: 'foto1', src: foto1 },
  { key: 'foto2', src: foto2 },
  { key: 'foto3', src: foto3 },
];

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function Profile(): JSX.Element {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [palette, setPalette] = useState(tokensSet.palette1);
  const [email, setEmail] = useState<string>('');
  const [fotoKey, setFotoKey] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [password, setPassword] = useState('');
  const [sendingPassword, setSendingPassword] = useState(false);

  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timer, setTimer] = useState(0);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'info' | 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = palette.primaryContrastText;
    document.documentElement.style.backgroundColor = palette.primaryContrastText;
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
    };
  }, [palette.primaryContrastText]);

  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_BASE}/user`, { headers: { Authorization: `Bearer ${token}` } });
        const tema = res.data?.tema ?? res.data?.tema_user ?? res.data?.theme ?? null;
        if (tema && tokensSet[tema as keyof typeof tokensSet]) {
          setPalette(tokensSet[tema as keyof typeof tokensSet]);
        }
      } catch (err) {
        console.error('Error fetching user theme:', err);
      }
    };
    void fetchUserTheme();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/user`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        if (data.email) setEmail(data.email);
        if (data.foto) setFotoKey(data.foto);
        const tema = data?.tema ?? data?.theme ?? null;
        if (tema && tokensSet[tema as keyof typeof tokensSet]) {
          setPalette(tokensSet[tema as keyof typeof tokensSet]);
        }
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Gagal memuat data pengguna', severity: 'error' });
      }
    };
    void fetchUser();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => interval && clearInterval(interval);
  }, [timer]);

  const avatarSrc = fotoKey && FOTO_MAP[fotoKey] ? FOTO_MAP[fotoKey] : undefined;
  const validatePasswordLen = (v: string) => v.length >= 5;

  const openPhotoDialog = () => {
    setSelectedKey(fotoKey ?? AVAILABLE_PHOTOS[0].key);
    setPhotoDialogOpen(true);
  };
  const closePhotoDialog = () => {
    setPhotoDialogOpen(false);
    setSelectedKey(null);
  };
  const handleSelectPhoto = (key: string) => setSelectedKey(key);

  const handleSavePhoto = async () => {
    if (!selectedKey) return;
    const token = localStorage.getItem('token');
    if (!token) return setSnackbar({ open: true, message: 'Anda harus login', severity: 'error' });

    setSavingPhoto(true);
    try {
      const res = await fetch(`${API_BASE}/user/foto`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: selectedKey }),
      });
      if (!res.ok) throw new Error(`Server: ${res.status}`);
      setFotoKey(selectedKey);
      setSnackbar({ open: true, message: 'Foto profil berhasil diperbarui', severity: 'success' });
      setPhotoDialogOpen(false);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Gagal menyimpan foto profil', severity: 'error' });
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleSendPasswordVerification = async () => {
  const token = localStorage.getItem('token');
  if (!token) return setSnackbar({ open: true, message: 'Anda harus login', severity: 'error' });

  if (!email) return setSnackbar({ open: true, message: 'Email tidak tersedia', severity: 'error' });

  setSendingPassword(true);
  try {
    const res = await fetch(`${API_BASE}/user/send-code`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }), // <-- kirim email
    });
    if (!res.ok) throw new Error(`Server: ${res.status}`);
    setSnackbar({ open: true, message: 'Email verifikasi password dikirim', severity: 'success' });
    setVerificationMode(true);
    setTimer(60);
  } catch (err) {
    console.error(err);
    setSnackbar({ open: true, message: 'Gagal mengirim email verifikasi', severity: 'error' });
  } finally {
    setSendingPassword(false);
  }
};


const handleConfirmPassword = async () => {
  const token = localStorage.getItem('token');
  if (!token) return setSnackbar({ open: true, message: 'Anda harus login', severity: 'error' });
  if (!email) return setSnackbar({ open: true, message: 'Email tidak tersedia', severity: 'error' });
  if (!verificationCode) return setSnackbar({ open: true, message: 'Kode verifikasi tidak boleh kosong', severity: 'error' });
  if (!validatePasswordLen(password)) return setSnackbar({ open: true, message: 'Password minimal 5 karakter', severity: 'error' });

  try {
    const res = await fetch(`${API_BASE}/user/verify-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: verificationCode, newPassword: password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Server: ${res.status}`);
    }

    const data = await res.json();
    setSnackbar({ open: true, message: data.message || 'Verifikasi berhasil', severity: 'success' });
    setVerificationMode(false);
    setVerificationCode('');
    setPassword('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(err);
    setSnackbar({ open: true, message: err.message || 'Kode verifikasi salah atau expired', severity: 'error' });
  }
};


  const handleResendCode = () => handleSendPasswordVerification();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Box display="flex" justifyContent="center" p={{ xs: 2, sm: 4 }} sx={{ width: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 920, bgcolor: palette.primary }}>
        <CardContent>
          <Stack spacing={3} alignItems="center">
            {/* Avatar + ganti foto */}
            <Stack alignItems="center" spacing={1}>
              <Avatar src={avatarSrc} sx={{ width: isMobile ? 120 : 160, height: isMobile ? 120 : 160 }} />
              <Button
                variant="contained"
                onClick={openPhotoDialog}
                sx={{
                  color: palette.primaryContrastText,
                  bgcolor: palette.primaryLight,
                  '&:hover': { bgcolor: palette.primaryDark },
                }}
              >
                Ganti Foto
              </Button>
            </Stack>

            {/* Email & Password */}
            <Box sx={{ width: '100%' }}>
              <TextField
                label="Email"
                value={email}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
                disabled
                sx={{
                  '& .MuiInputBase-input': { color: palette.textPrimary },
                  '& .MuiInputLabel-root': { color: palette.textSecondary },
                }}
              />

              <TextField
                label="Password Baru"
                type={ 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                margin="normal"
                placeholder="********"
                InputLabelProps={{ shrink: true }}
                helperText="Minimal 5 karakter"
                error={password.length > 0 && !validatePasswordLen(password)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {/* <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton> */}
                    </InputAdornment>
                  ),
                }}
                sx={{
                  input: { color: palette.textPrimary },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: palette.primaryContrastText },
                    '&:hover fieldset': { borderColor: palette.primaryContrastText },
                    '&.Mui-focused fieldset': { borderColor: palette.primaryContrastText },
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: `0 0 0 1000px ${palette.primary} inset`,
                      WebkitTextFillColor: palette.primaryContrastText,
                      transition: 'background-color 5000s ease-in-out 0s',
                    },
                  },
                  '& .MuiInputLabel-root': { color: palette.primaryContrastText },
                  '& .MuiInputLabel-root.Mui-focused': { color: palette.primaryContrastText },
                }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={verificationMode ? handleConfirmPassword : handleSendPasswordVerification}
                disabled={sendingPassword}
                sx={{ mt: 1, backgroundColor: palette.info, color: palette.primaryContrastText, ':hover': { backgroundColor: palette.info } }}
              >
                {sendingPassword ? <CircularProgress size={20} color="inherit" /> : verificationMode ? 'Konfirmasi' : 'Verifikasi'}
              </Button>

              {verificationMode && (
                <Box sx={{ width: '100%', mt: 1 }}>
                  <TextField
                    label="Kode Verifikasi"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    fullWidth
                    margin="normal"
                    sx={{
                      input: { color: palette.textPrimary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: palette.primaryContrastText },
                        '&:hover fieldset': { borderColor: palette.primaryContrastText },
                        '&.Mui-focused fieldset': { borderColor: palette.primaryContrastText },
                        '& input:-webkit-autofill': {
                          WebkitBoxShadow: `0 0 0 1000px ${palette.primary} inset`,
                          WebkitTextFillColor: palette.primaryContrastText,
                          transition: 'background-color 5000s ease-in-out 0s',
                        },
                      },
                      '& .MuiInputLabel-root': { color: palette.primaryContrastText },
                      '& .MuiInputLabel-root.Mui-focused': { color: palette.primaryContrastText },
                    }}
                  />
                  {timer > 0 ? (
                    <Typography variant="body2" sx={{ color: palette.textSecondary }}>
                      Kirim ulang kode dalam {timer}s
                    </Typography>
                  ) : (
                    <Link component="button" variant="body2" onClick={handleResendCode} sx={{ color: palette.textSecondary }}>
                      Kirim ulang kode
                    </Link>
                  )}
                </Box>
              )}
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={handleLogout}
              sx={{ backgroundColor: palette.error, color: palette.primaryContrastText, ':hover': { backgroundColor: palette.error } }}
            >
              Logout
            </Button>
          </Stack>
        </CardContent>
      </Card>

   <Dialog
  open={photoDialogOpen}
  onClose={closePhotoDialog}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      maxHeight: '80vh', // maksimal 80% tinggi layar
    },
  }}
>
  <DialogTitle sx={{ bgcolor: palette.surface, color: palette.textPrimary }}>
    Pilih Foto Profil
  </DialogTitle>
  <DialogContent
    sx={{
      bgcolor: palette.surface,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'auto',
    }}
  >
    <Avatar
      src={selectedKey ? FOTO_MAP[selectedKey] : avatarSrc}
      sx={{ width: isMobile ? 80 : 120, height: isMobile ? 80 : 120, mb: 2 }}
    />
    <Box
      sx={{
        display: 'grid',
        gap: isMobile ? 8 : 12,
        gridTemplateColumns: {
          xs: `repeat(auto-fill, minmax(70px, 1fr))`,
          sm: `repeat(auto-fill, minmax(100px, 1fr))`,
        },
        width: '100%',
        justifyContent: 'center',
      }}
    >
      {AVAILABLE_PHOTOS.map((p) => {
        const isSelected = selectedKey === p.key;
        return (
          <Box
            key={p.key}
            onClick={() => handleSelectPhoto(p.key)}
            sx={{
              width: '100%',
              aspectRatio: '1 / 1',
              cursor: 'pointer',
              borderRadius: 1,
              overflow: 'hidden',
              border: isSelected ? `3px solid ${palette.primary}` : '1px solid',
              borderColor: isSelected ? palette.primary : palette.surface,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 0.5,
            }}
          >
            <Box
              component="img"
              src={p.src}
              alt={p.key}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        );
      })}
    </Box>
  </DialogContent>
  <DialogActions sx={{ px: 3, pb: 2, bgcolor: palette.surface }}>
    <Button onClick={closePhotoDialog} variant="text" sx={{ color: palette.textPrimary }}>
      Batal
    </Button>
    <Button
      onClick={handleSavePhoto}
      variant="contained"
      disabled={!selectedKey || savingPhoto}
      sx={{
        backgroundColor: palette.primary,
        color: palette.primaryContrastText,
        ':hover': { backgroundColor: palette.primaryDark },
      }}
    >
      {savingPhoto ? <CircularProgress size={18} color="inherit" /> : 'Simpan Foto'}
    </Button>
  </DialogActions>
</Dialog>


      <Snackbar
        open={snackbar.open}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
}
