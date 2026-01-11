import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  Avatar
} from '@mui/material';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import logoTripsel from '../../../assets/icononly.png';
import placeholder from '../../../assets/user.png';
import { useTheme } from '@mui/material/styles';
import { Menu as MenuIcon } from '@mui/icons-material';

import foto1 from '../../../assets/fotouser/foto1.png';
import foto2 from '../../../assets/fotouser/foto2.png';
import foto3 from '../../../assets/fotouser/foto3.png';

import { tokensSet } from '../../../theme/tokens';

const fotoMap: Record<string, string> = {
  foto1,
  foto2,
  foto3,
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

type PaletteKey = keyof typeof tokensSet;

export default function Navbar() {
  const [isOpaque, setIsOpaque] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const [menuActive, setMenuActive] = useState(false);
  const [userFoto, setUserFoto] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [palette, setPalette] = useState(tokensSet.palette1);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      try {
        const response = await fetch(`${API_BASE}/user`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (data) {
          if (data.foto) setUserFoto(data.foto);

          if (data.tema && typeof data.tema === 'string' && data.tema in tokensSet) {
            setPalette(tokensSet[data.tema as PaletteKey]);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleProfileMenuOpen = (event: React.SyntheticEvent) => {
    setProfileAnchorEl(event.currentTarget as HTMLElement);
    handleMenuOpen();
  };

  const handleMenuOpen = () => setMenuActive(true);
  const handleMenuClose = () => {
    setProfileAnchorEl(null);
    setMenuActive(false);
  };

  const handleBeranda = () => navigate(`/`);
  const handleProduk = () => navigate(`/produk`);
  const handlePaketku = () => navigate(`/daftar-paketku`);
  const handleProfile = () => navigate(`/profile`);
  const handleLogin = () => navigate(`/login`);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    navigate(`/login`);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsOpaque(scrollTop > 0 || menuActive);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuActive]);

  const avatarSrc = userFoto && fotoMap[userFoto] ? fotoMap[userFoto] : placeholder;

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: palette.pageBackground,
        transition: 'background-color 0.3s ease-in-out',
        boxShadow: isOpaque ? '0px 4px 20px rgba(0, 0, 0, 0.1)' : 'none',
        padding: { xs: '0px 16px', sm: '0px 20px', md: '0px 30px' },
        height: { xs: '70px', sm: '80px', md: '105px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row'
      }}
    >
      {/* LOGO */}
      <Stack sx={{ width: { xs: '70px', sm: '80px', md: '100px' } }}>
        <img style={{ width: '100%', height: 'auto' }} src={logoTripsel} alt="logo" />
      </Stack>

      {/* DESKTOP MENU */}
      {!isMobile && (
        <Stack direction="row" spacing={{ xs: 1, sm: 2, md: 3 }} alignItems="center">
          
         

          {/* === BERANDA === */}
          <Button
            disableElevation
            disableRipple
            onClick={handleBeranda}
            sx={{
              color: palette.textPrimary,
              '&:hover': { color: palette.primaryDark, fontWeight: 700 },
              minWidth: 'auto',
              padding: '0px',
            }}
          >
            <Typography sx={{ fontSize: { sm: 20, md: 24 } }}>Beranda</Typography>
          </Button>
 {/* === PRODUK === */}
          <Button
            disableElevation
            disableRipple
            onClick={handleProduk}
            sx={{
              color: palette.textPrimary,
              '&:hover': { color: palette.primaryDark, fontWeight: 700 },
              minWidth: 'auto',
              padding: '0px',
            }}
          >
            <Typography sx={{ fontSize: { sm: 20, md: 24 } }}>Produk</Typography>
          </Button>
          {/* === PAKETKU === */}
          <Button
            disableElevation
            disableRipple
            onClick={handlePaketku}
            sx={{
              color: palette.textPrimary,
              '&:hover': { color: palette.primaryDark, fontWeight: 700 },
              minWidth: 'auto',
              padding: '0px',
            }}
          >
            <Typography sx={{ fontSize: { sm: 20, md: 24 } }}>Paketku</Typography>
          </Button>

          {/* LOGIN / AVATAR */}
          {!isLoggedIn ? (
            <Button
              disableElevation
              disableRipple
              onClick={handleLogin}
              sx={{
                color: palette.textPrimary,
                '&:hover': { color: palette.primaryDark, fontWeight: 700 },
                minWidth: 'auto',
                padding: '0px',
              }}
            >
              <Typography sx={{ fontSize: { sm: 20, md: 24 } }}>Masuk</Typography>
            </Button>
          ) : (
            <Button
              disableElevation
              disableRipple
              onClick={handleProfileMenuOpen}
              sx={{
                color: palette.textPrimary,
                '&:hover': { color: palette.primary, fontWeight: 700 },
                minWidth: 'auto',
                padding: '0px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Avatar src={avatarSrc} alt="User" sx={{ width: 80, height: 80, mr: 1 }} />
            </Button>
          )}

          {/* DROPDOWN PROFILE */}
          <Menu
            anchorEl={profileAnchorEl}
            open={Boolean(profileAnchorEl)}
            onClose={handleMenuClose}
            elevation={0}
            PaperProps={{
              style: {
                background: palette.primary,
                boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
                width: '200px',
                borderRadius: '0 0 30px 30px',
              },
            }}
          >
            <MenuItem onClick={handleProfile} sx={{ color: palette.textPrimary }}>Profile</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: palette.textPrimary }}>Sign out</MenuItem>
          </Menu>
        </Stack>
      )}

      {/* MOBILE MENU */}
      {isMobile && (
        <>
          <IconButton
            edge="end"
            onClick={handleDrawerToggle}
            sx={{ color: palette.textPrimary }}
          >
            <MenuIcon fontSize={isSmallMobile ? 'medium' : 'large'} />
          </IconButton>

          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            PaperProps={{
              style: {
                width: isSmallMobile ? '200px' : '250px',
                paddingTop: '20px',
                backgroundColor: palette.primary,
                color: palette.textPrimary,
              }
            }}
          >
            <Stack alignItems="center" spacing={1} sx={{ padding: '10px 0' }}>
              {!isLoggedIn ? (
                <Typography sx={{ fontSize: 20, fontWeight: 600 }}>Masuk</Typography>
              ) : (
                <Avatar src={avatarSrc} alt="User" sx={{ width: 70, height: 70 }} />
              )}
            </Stack>

            <Divider />

            <List sx={{ padding: '0' }}>

              

              {/* MOBILE: BERANDA */}
              <ListItem
                onClick={() => {
                  handleBeranda();
                  handleDrawerToggle();
                }}
                sx={{ padding: '12px 24px' }}
              >
                <ListItemText
                  primary="Beranda"
                  primaryTypographyProps={{
                    fontSize: isSmallMobile ? '16px' : '18px',
                    color: palette.textPrimary,
                  }}
                />
              </ListItem>
              <Divider />
{/* MOBILE: PRODUK */}
              <ListItem
                onClick={() => {
                  handleProduk();
                  handleDrawerToggle();
                }}
                sx={{ padding: '12px 24px' }}
              >
                <ListItemText
                  primary="Produk"
                  primaryTypographyProps={{
                    fontSize: isSmallMobile ? '16px' : '18px',
                    color: palette.textPrimary,
                  }}
                />
              </ListItem>
              <Divider />
              {/* MOBILE: PAKETKU */}
              <ListItem
                onClick={() => {
                  handlePaketku();
                  handleDrawerToggle();
                }}
                sx={{ padding: '12px 24px' }}
              >
                <ListItemText
                  primary="Paketku"
                  primaryTypographyProps={{
                    fontSize: isSmallMobile ? '16px' : '18px',
                    color: palette.textPrimary,
                  }}
                />
              </ListItem>
              <Divider />

              {/* MOBILE: LOGIN / PROFILE */}
              {!isLoggedIn ? (
                <>
                  <ListItem
                    onClick={() => {
                      handleLogin();
                      handleDrawerToggle();
                    }}
                    sx={{ padding: '12px 24px' }}
                  >
                    <ListItemText
                      primary="Masuk"
                      primaryTypographyProps={{
                        fontSize: isSmallMobile ? '16px' : '18px',
                        color: palette.textPrimary,
                      }}
                    />
                  </ListItem>
                  <Divider />
                </>
              ) : (
                <>
                  <ListItem
                    onClick={() => {
                      handleProfile();
                      handleDrawerToggle();
                    }}
                    sx={{ padding: '12px 24px' }}
                  >
                    <ListItemText
                      primary="Profile"
                      primaryTypographyProps={{
                        fontSize: isSmallMobile ? '16px' : '18px',
                        color: palette.textPrimary,
                      }}
                    />
                  </ListItem>
                  <Divider />

                  <ListItem
                    onClick={() => {
                      handleLogout();
                      handleDrawerToggle();
                    }}
                    sx={{ padding: '12px 24px' }}
                  >
                    <ListItemText
                      primary="Sign out"
                      primaryTypographyProps={{
                        fontSize: isSmallMobile ? '16px' : '18px',
                        color: palette.textPrimary,
                      }}
                    />
                  </ListItem>
                  <Divider />
                </>
              )}
            </List>
          </Drawer>
        </>
      )}
    </AppBar>
  );
}
