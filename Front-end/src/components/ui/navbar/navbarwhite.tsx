import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Container,Drawer,List,ListItem, ListItemText, Toolbar, Stack, Typography, Button, InputBase, IconButton, Menu, MenuItem, Divider, Link, useMediaQuery } from '@mui/material';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import logoTripsel from '../../../assets/Trip-sel.png';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useTheme } from '@mui/material/styles';
import {Menu as MenuIcon}  from '@mui/icons-material';
const menuItemStyle = {
  fontSize: '22px',
  fontWeight: 500,
  padding: '0px 20px',
  transition: 'color 0.3s ease-in-out', 
  '&:hover': {
    color: 'red', // Change text color to red on hover
  }
};

interface Data {
  oleh: OlehData[];
  wisata: WisataData[];
  hotels: HotelData[];
  restoran: RestoranData[];
  area: Area[];
}
interface OlehData {
  nama: string;
  // Add more properties as needed
}

interface WisataData {
  nama: string;
  // Add more properties as needed
}

interface HotelData {
  nama: string;
  // Add more properties as needed
}

interface RestoranData {
  nama: string;
  // Add more properties as needed
}
interface Area {
  domisili: string;
  // Add more properties as needed
}
export default function Navbar() {
  const [isOpaque, setIsOpaque] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [hotelAnchorEl, setHotelAnchorEl] = useState<null | HTMLElement>(null); // Separate state for hotel menu
  const [restoranAnchorEl, setRestoranAnchorEl] = useState<null | HTMLElement>(null); // Separate state for restoran menu
  const [olehOlehAnchorEl, setOlehOlehAnchorEl] = useState<null | HTMLElement>(null); // State for oleh-oleh menu
  const [wisataAnchorEl, setWisataAnchorEl] = useState<null | HTMLElement>(null); // State for wisata menu
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [hotelMenuActive, setHotelMenuActive] = useState(false); // State to track hotel menu activation
  const [restoranMenuActive, setRestoranMenuActive] = useState(false); // State to track restoran menu activation
  const [olehOlehMenuActive, setOlehOlehMenuActive] = useState(false); // State to track oleh-oleh menu activation
  const [wisataMenuActive, setWisataMenuActive] = useState(false); // State to track wisata menu activation
  const [profileMenuActive, setProfileMenuActive] = useState(false);
  const navigate = useNavigate();
  const [menuActive, setMenuActive] = useState(false);
  const [userFullName, setUserFullName] = useState('');
  // const [isProfilePage, setIsProfilePage] = useState(false);
  const [data, setData] = useState<Data>({
    oleh: [],
    wisata: [],
    hotels: [],
    restoran: [],
    area: [],
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const olehResponse = await fetch('https://tripselbe.fly.dev/oleh');
        const olehData: OlehData[] = await olehResponse.json();
  
        const wisataResponse = await fetch('https://tripselbe.fly.dev/wisata');
        const wisataData: WisataData[] = await wisataResponse.json();
  
        const hotelsResponse = await fetch('https://tripselbe.fly.dev/hotels');
        const hotelsData: HotelData[] = await hotelsResponse.json();
  
        const restoranResponse = await fetch('https://tripselbe.fly.dev/restoran');
        const restoranData: RestoranData[] = await restoranResponse.json();
  
        const areaResponse = await fetch('https://tripselbe.fly.dev/area');
        const areaData: Area[] = await areaResponse.json();
  
        setData({
          oleh: olehData,
          wisata: wisataData,
          hotels: hotelsData,
          restoran: restoranData,
          area: areaData,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, []);

  // useEffect(() => {
  //   setIsProfilePage(location.pathname === '/profile');
  // }, [location.pathname]);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      console.log(token);
  
      if (token) {
        try {
          const response = await fetch('https://tripselbe.fly.dev/user', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          console.log(data); // Log the received data
          if (data && data.full_name) {
            setUserFullName(data.full_name);
          } else {
            console.error('Full name not found in user data');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
  
    fetchUserData();
  }, []);

  const handleProfileMenuOpen = (event: React.SyntheticEvent) => {
    setProfileAnchorEl(event.currentTarget as HTMLElement); // Set anchor element when hotel menu button is clicked
    setProfileMenuActive(true); // Set hotel menu as active
    handleMenuOpen();
  };

  const handleHotelMenuOpen = (event: React.SyntheticEvent) => {
    setHotelAnchorEl(event.currentTarget as HTMLElement); // Set anchor element when hotel menu button is clicked
    setHotelMenuActive(true); // Set hotel menu as active
    handleMenuOpen();
  };

  const handleRestoranMenuOpen = (event: React.SyntheticEvent) => {
    setRestoranAnchorEl(event.currentTarget as HTMLElement); // Set anchor element when restoran menu button is clicked
    setRestoranMenuActive(true); // Set restoran menu as active
    handleMenuOpen();
  };
  const handleOlehOlehMenuOpen = (event: React.SyntheticEvent) => {
    setOlehOlehAnchorEl(event.currentTarget as HTMLElement); // Set anchor element when oleh-oleh menu button is clicked
    setOlehOlehMenuActive(true); // Set oleh-oleh menu as active
    handleMenuOpen();
  };

  const handleWisataMenuOpen = (event: React.SyntheticEvent) => {
    setWisataAnchorEl(event.currentTarget as HTMLElement); // Set anchor element when wisata menu button is clicked
    setWisataMenuActive(true); // Set wisata menu as active
    handleMenuOpen();
  };
  const handleMenuOpen = () => {
    setMenuActive(true);
  };

  const handleMenuClose = () => {
    setHotelAnchorEl(null); // Clear hotel anchor element to close the hotel menu
    setRestoranAnchorEl(null); // Clear restoran anchor element to close the restoran menu
    setOlehOlehAnchorEl(null); // Clear hotel anchor element to close the hotel menu
    setWisataAnchorEl(null);
    setProfileAnchorEl(null);
    setHotelMenuActive(false); // Set hotel menu as inactive
    setRestoranMenuActive(false); // Set restoran menu as inactive
    setOlehOlehMenuActive(false); // Set oleh-oleh menu as inactive
    setWisataMenuActive(false); // Set wisata menu as inactive
    setProfileMenuActive(false); // Set wisata menu as inactive
    setMenuActive(false);
  };

  const handleBerandamenu = () => {
    navigate(`/`)
  }
  const handleProfilemenu = () => {
    navigate(`/profile`)
  }
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate(`/login`)
  }
  const handleMenuItemClick = (destination: string) => {
    navigate(`/hotel?Gas=${destination}`);
    handleMenuClose(); // Close the menu after clicking on a menu item
  };
 
  const handleRestoranMenuItemClick = (destination: string) => {
    navigate(`/restoran?Gas=${destination}`);
    handleMenuClose(); // Close the menu after clicking on a menu item
  };

  const handleOlehOlehMenuItemClick = (destination: string) => {
    navigate(`/oleh-oleh?Gas=${destination}`);
    handleMenuClose(); // Close the menu after clicking on a menu item
  };

  const handleWisataMenuItemClick = (destination: string) => {
    navigate(`/wisata?Gas=${destination}`);
    handleMenuClose(); // Close the menu after clicking on a menu item
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  const handleClear = () => {
    setSearchValue('');
    setShowCategories(true);
  };

  useEffect(() => {
    // Function to handle scroll event
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsOpaque(scrollTop > 0 || menuActive); // Update isOpaque based on scroll position or menu active state
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuActive]); // Listen for changes in menuActive state


  const handleSearchButtonClick = () => {
    setShowCategories(prevState => !prevState); // Toggle the state of showCategories
    setSearchValue(''); // Clear search input when toggling visibility
  };
  return (

    <AppBar
      position="sticky"
      sx={{
        // backgroundColor: (hotelMenuActive || restoranMenuActive || olehOlehMenuActive || wisataMenuActive) ? 'white' : (isOpaque ? 'white' : 'transparent'),
        backgroundColor: (isOpaque ? 'white' : 'white'),
        transition: 'background-color 0.3s ease-in-out', // Add transition effect
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
        margin: '0px 0px',
        padding: '0px 0px',
        height:'105px',
        alignItems:'center',
        justifyContent: 'center'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar style={{ justifyContent: 'space-between', height:'105px' }}>
          <Stack sx={{ width: '200px' }}>
            <img src={logoTripsel} alt="logo" />
          </Stack>
          <Stack gap={3}  width={ {md: '80%',xs:'auto'} }  direction={'row'}>
          {isMobile ? (
            <>
              <IconButton
                edge="end"
                onClick={handleDrawerToggle}
                sx={{ display: { md: 'none' }, color:'#6E6C6C' }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={handleDrawerToggle}
                PaperProps={{
                  style: {
                    width: '250px',
                  },
                }}
              >
                <List>
                  <ListItem onClick={handleMenuClose}>
                    <ListItemText primary="Beranda" onClick={handleBerandamenu} />
                  </ListItem>
                  <Divider />
                  <ListItem onClick={handleHotelMenuOpen}>
                    <ListItemText primary="Hotel" onClick={() =>handleHotelMenuOpen}  />
                  </ListItem>
                  <Menu
                    disableScrollLock
                    anchorEl={hotelAnchorEl}
                    open={Boolean(hotelAnchorEl)}
                    onClose={handleMenuClose}
                    elevation={0}
                    PaperProps={{
                      style: {
                        background: 'white',
                        boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                        color: '#6E6C6C',
                        width: '250px',
                        borderRadius: '0px 0px 30px 30px',
                        transition: 'background 0.2s ease-in-out',
                      },
                    }}
                  >
                    {data.area.map((area, index) => (
                      <Stack key={area.domisili}>
                        <MenuItem onClick={() => handleMenuItemClick(area.domisili)} sx={menuItemStyle}>
                          {area.domisili}
                        </MenuItem>
                        {index < data.area.length - 1 && <Divider />}
                      </Stack>
                    ))}
                  </Menu>
                  <Divider />
                  <ListItem onClick={handleRestoranMenuOpen}>
                    <ListItemText primary="Restoran" />
                  </ListItem>
                  <Menu
                    disableScrollLock
                    anchorEl={restoranAnchorEl}
                    open={Boolean(restoranAnchorEl)}
                    onClose={handleMenuClose}
                    elevation={0}
                    PaperProps={{
                      style: {
                        background: 'white',
                        boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                        color: '#6E6C6C',
                        width: '250px',
                        borderRadius: '0px 0px 30px 30px',
                        transition: 'background 0.2s ease-in-out',
                      },
                    }}
                  >
                    {data.area.map((area, index) => (
                      <Stack key={area.domisili}>
                        <MenuItem onClick={() => handleRestoranMenuItemClick(area.domisili)} sx={menuItemStyle}>
                          {area.domisili}
                        </MenuItem>
                        {index < data.area.length - 1 && <Divider />}
                      </Stack>
                    ))}
                  </Menu>
                  <Divider />
                  <ListItem onClick={handleOlehOlehMenuOpen}>
                    <ListItemText primary="Oleh-oleh" />
                  </ListItem>
                  <Menu
                    disableScrollLock
                    anchorEl={olehOlehAnchorEl}
                    open={Boolean(olehOlehAnchorEl)}
                    onClose={handleMenuClose}
                    elevation={0}
                    PaperProps={{
                      style: {
                        background: 'white',
                        boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                        color: '#6E6C6C',
                        width: '250px',
                        borderRadius: '0px 0px 30px 30px',
                        transition: 'background 0.2s ease-in-out',
                      },
                    }}
                  >
                    {data.area.map((area, index) => (
                      <Stack key={area.domisili}>
                        <MenuItem onClick={() => handleOlehOlehMenuItemClick(area.domisili)} sx={menuItemStyle}>
                          {area.domisili}
                        </MenuItem>
                        {index < data.area.length - 1 && <Divider />}
                      </Stack>
                    ))}
                  </Menu>
                  <Divider />
                  <ListItem onClick={handleWisataMenuOpen}>
                    <ListItemText primary="Wisata" />
                  </ListItem>
                  <Menu
                    disableScrollLock
                    anchorEl={wisataAnchorEl}
                    open={Boolean(wisataAnchorEl)}
                    onClose={handleMenuClose}
                    elevation={0}
                    PaperProps={{
                      style: {
                        background: 'white',
                        boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                        color: '#6E6C6C',
                        width: '250px',
                        borderRadius: '0px 0px 30px 30px',
                        transition: 'background 0.2s ease-in-out',
                      },
                    }}
                  >
                    {data.area.map((area, index) => (
                      <Stack key={area.domisili}>
                        <MenuItem onClick={() => handleWisataMenuItemClick(area.domisili)} sx={menuItemStyle}>
                          {area.domisili}
                        </MenuItem>
                        {index < data.area.length - 1 && <Divider />}
                      </Stack>
                    ))}
                  </Menu>
                  <Divider />
                  <ListItem onClick={handleProfileMenuOpen}>
                    <ListItemText primary="Profile" />
                  </ListItem>
                  <Menu
                    disableScrollLock
                    anchorEl={profileAnchorEl}
                    open={Boolean(profileAnchorEl)}
                    onClose={handleMenuClose}
                    elevation={0}
                    PaperProps={{
                      style: {
                        background: 'white',
                        boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                        color: '#6E6C6C',
                        width: '250px',
                        borderRadius: '0px 0px 30px 30px',
                        transition: 'background 0.2s ease-in-out',
                      },
                    }}
                  >
                    <MenuItem onClick={handleProfilemenu} sx={menuItemStyle}>Profile</MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={menuItemStyle}>Sign out</MenuItem>
                  </Menu>
                </List>
              </Drawer>
            </>
          ) : (
            <Stack direction={'row'} gap={3}>
            {showCategories && (
              <Stack direction={'row'} justifyContent={'space-between'} width={'100%'} height={'105px'}>
                <Button disableElevation disableFocusRipple disableRipple disableTouchRipple
                  onClick={handleBerandamenu}
                  sx={{
                    color: isOpaque ? '#6E6C6C' : 'gray', // Change text color to gray
                    '&:hover': { fontWeight: 700, color: 'red' },
                    padding:'0px',
                    minWidth:'auto',
                    height:'auto',
                    transition: 'color 0.75s ease-in-out',
                  }}
                >
                   <Typography
                      sx={{
                        alignContent: 'center',
                        paddingLeft: '5px',
                        paddingRight: '5px',
                        paddingTop: '5px',
                        fontSize: '24px',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        transition: 'font-weight 0.1s ease-in-out',
                      }}
                    >
                      Beranda
                    </Typography>
                </Button>
                <Button disableElevation disableFocusRipple disableRipple disableTouchRipple
                  onClick={handleHotelMenuOpen}
                  endIcon={<ExpandMoreIcon sx={{transform: hotelMenuActive ? 'rotate(180deg)' : 'rotate(0deg)',stroke: hotelMenuActive ? 'red' : 'currentColor', strokeWidth: 2, transition: 'stroke 0.75s ease-in-out' }} />}
                  sx={{
                    color: hotelMenuActive ? 'red' : (isOpaque ? '#6E6C6C' : 'gray'),
                    '&:hover': { fontWeight: 700, color: hotelMenuActive ? 'red' : 'red' },
                  }}
                >
                   <Typography
                      sx={{
                        alignContent: 'center',
                        paddingLeft: '5px',
                        paddingRight: '5px',
                        paddingTop: '5px',
                        fontSize: '24px',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        transition: 'font-weight 0.1s ease-in-out, ',
                      }}
                    >
                      Hotel
                    </Typography>
                </Button>
                
                <Menu
                disableScrollLock
                anchorEl={hotelAnchorEl}
                open={Boolean(hotelAnchorEl)}
                onClose={handleMenuClose}
                elevation={0}
                PaperProps={{
                  style: {
                    background: isOpaque ? 'white' : 'white',
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                    color: isOpaque ? '#6E6C6C' : '#6E6C6C',
                    width:'270px',
                    borderRadius:'0px 0px 30px 30px',
                    transition: 'background 0.2s ease-in-out ',
                  },
                }}
              >
                    {data.area.map((area, index) => (
              <Stack key={area.domisili}>
                <MenuItem onClick={() => handleMenuItemClick(area.domisili)} sx={menuItemStyle}>
                  {area.domisili}
                </MenuItem>
                {index < data.area.length - 1 && <Divider />}
              </Stack>
            ))}
            </Menu>

            <Button disableElevation disableFocusRipple disableRipple disableTouchRipple
                  onClick={handleRestoranMenuOpen}
                  endIcon={<ExpandMoreIcon sx={{transform: restoranMenuActive ? 'rotate(180deg)' : 'rotate(0deg)',stroke: restoranMenuActive ? 'red' : 'currentColor', strokeWidth: 2, transition: 'stroke 0.75s ease-in-out' }} />}
                  sx={{
                    color: restoranMenuActive ? 'red' : (isOpaque ? '#6E6C6C' : 'gray'),
                    '&:hover': { fontWeight: 700, color: restoranMenuActive ? 'red' : 'red' },
                  }}
                >
                   <Typography
                      sx={{
                        alignContent: 'center',
                        paddingLeft: '5px',
                        paddingRight: '5px',
                        paddingTop: '5px',
                        fontSize: '24px',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        transition: 'font-weight 0.1s ease-in-out ',
                      }}
                    >
                      Restoran
                    </Typography>
                </Button>
                <Menu
                disableScrollLock
                anchorEl={restoranAnchorEl}
                open={Boolean(restoranAnchorEl)}
                onClose={handleMenuClose}
                elevation={0}
                PaperProps={{
                  style: {
                    background: isOpaque ? 'white' : 'white',
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                    color: isOpaque ? '#6E6C6C' : '#6E6C6C',
                    width:'270px',
                    borderRadius:'0px 0px 30px 30px',
                    transition: 'background 0.2s ease-in-out ',
                  },
                }}
              >
                   {data.area.map((area, index) => (
              <Stack key={area.domisili}>
                <MenuItem onClick={() => handleRestoranMenuItemClick(area.domisili)} sx={menuItemStyle}>
                  {area.domisili}
                </MenuItem>
                {index < data.area.length - 1 && <Divider />}
              </Stack>
            ))}
                </Menu>
               <Button disableElevation disableFocusRipple disableRipple disableTouchRipple
                  onClick={handleOlehOlehMenuOpen}
                  endIcon={<ExpandMoreIcon sx={{transform: olehOlehMenuActive ? 'rotate(180deg)' : 'rotate(0deg)',stroke: olehOlehMenuActive ? 'red' : 'currentColor', strokeWidth: 2, transition: 'stroke 0.75s ease-in-out' }} />}
                  sx={{
                    color: olehOlehMenuActive ? 'red' : (isOpaque ? '#6E6C6C' : 'gray'),
                    '&:hover': { fontWeight: 700, color: olehOlehMenuActive ? 'red' : 'red' },
                  }}
                >
                   <Typography
                      sx={{
                        alignContent: 'center',
                        paddingLeft: '5px',
                        paddingRight: '5px',
                        paddingTop: '5px',
                        fontSize: '24px',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        transition: 'font-weight 0.1s ease-in-out ',
                      }}
                    >
                      Oleh-oleh
                    </Typography>
                </Button>
                <Menu
                disableScrollLock
                anchorEl={olehOlehAnchorEl}
                open={Boolean(olehOlehAnchorEl)}
                onClose={handleMenuClose}
                elevation={0}
                PaperProps={{
                  style: {
                    background: isOpaque ? 'white' : 'white',
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                    color: isOpaque ? '#6E6C6C' : '#6E6C6C',
                    width:'270px',
                    borderRadius:'0px 0px 30px 30px',
                    transition: 'background 0.2s ease-in-out ',
                  },
                }}
              >
                    {data.area.map((area, index) => (
              <Stack key={area.domisili}>
                <MenuItem onClick={() => handleOlehOlehMenuItemClick(area.domisili)} sx={menuItemStyle}>
                  {area.domisili}
                </MenuItem>
                {index < data.area.length - 1 && <Divider />}
              </Stack>
            ))}
                </Menu>
                <Button disableElevation disableFocusRipple disableRipple disableTouchRipple
                  onClick={handleWisataMenuOpen}
                  endIcon={<ExpandMoreIcon sx={{transform: wisataMenuActive ? 'rotate(180deg)' : 'rotate(0deg)',stroke: wisataMenuActive ? 'red' : 'currentColor', strokeWidth: 2, transition: 'stroke 0.75s ease-in-out' }} />}
                  sx={{
                    color: wisataMenuActive ? 'red' : (isOpaque ? '#6E6C6C' : 'gray'),
                    '&:hover': { fontWeight: 700, color: wisataMenuActive ? 'red' : 'red' },
                  }}
                >
                   <Typography
                      sx={{
                        alignContent: 'center',
                        paddingLeft: '5px',
                        paddingRight: '5px',
                        paddingTop: '5px',
                        fontSize: '24px',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        transition: 'font-weight 0.1s ease-in-out',
                      }}
                    >
                      Wisata
                    </Typography>
                </Button>
                <Menu
                disableScrollLock
                anchorEl={wisataAnchorEl}
                open={Boolean(wisataAnchorEl)}
                onClose={handleMenuClose}
                elevation={0}
                PaperProps={{
                  style: {
                    background: isOpaque ? 'white' : 'white',
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                    color: isOpaque ? '#6E6C6C' : '#6E6C6C',
                    width:'270px',
                    borderRadius:'0px 0px 30px 30px',
                    transition: 'background 0.2s ease-in-out ',
                  },
                }}
              >
                    {data.area.map((area, index) => (
              <Stack key={area.domisili}>
                <MenuItem onClick={() => handleWisataMenuItemClick(area.domisili)} sx={menuItemStyle}>
                  {area.domisili}
                </MenuItem>
                {index < data.area.length - 1 && <Divider />}
              </Stack>
            ))}
                </Menu>
                
                <Stack justifyContent={'center'} alignItems={'center'}>
                <IconButton
              onClick={handleSearchButtonClick}
              disableTouchRipple
              disableFocusRipple
              disableRipple
              
              sx={{
                height: '54px',
                width:'54px',
                borderRadius: '50%',
                border:(isOpaque ? '2px solid gray' : (menuActive ? '2px solid gray' : '2px solid gray')),                  
                color: (isOpaque ? 'gray' : (menuActive ? 'gray' : 'gray')),
                  '&:hover': { fontWeight: 700, color: (isOpaque && (hotelMenuActive || restoranMenuActive || olehOlehMenuActive || wisataMenuActive || profileMenuActive)) ? 'gray' : 'red', border: (isOpaque && (hotelMenuActive || restoranMenuActive || olehOlehMenuActive || wisataMenuActive)) ? '3px solid gray' : '3px solid red'},
                  transition: 'color 0.75s ease-in-out, border 0.4s ease-in-out',
                padding: '0px',
                // '&:hover': { border:'3px solid #FF010C', color:'#FF010C' },
                // transition: 'color 0.75s ease-in-out, border 0.75s ease-in-out'
              }}
            >
              <SearchIcon sx={{ width: 'auto' }} />
            </IconButton>
            </Stack>
            </Stack>
            )}
               
           
            {!showCategories && (
  <Stack
    direction="row"
    alignItems="center"
    sx={{
      width: '100%',
      height: '54px',
      overflow: 'hidden', // Ensure content overflow is hidden during animation
      position: 'relative', // Set position to enable absolute positioning for animation
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      width={'100%'}
      sx={{
        position: 'absolute',
        right: 0, // Initially positioned outside the container
        animation: 'slideIn 0.5s forwards', // Animation for sliding in from right to left
        '@keyframes slideIn': {
          from: { right: '-100%' }, // Start from outside the container
          to: { right: 0 }, // Move to the left edge of the container
        },
      }}
    >
      <InputBase
        placeholder="Cari"
        value={searchValue}
        onChange={handleChange}
        startAdornment={<SearchIcon sx={{color:'#FF010C'}} />}
        endAdornment={
          <IconButton onClick={handleClear} sx={{color:'#FF010C'}} size="small">
            <CloseIcon />
          </IconButton>
        }
        sx={{
          borderRadius: '40px',
          border: '2px solid var(--Primary-Color---Red-3, #FF010C)',
          background: 'var(--Text---White, #FFF)',
          flex: 1,
          height: '100%',
          paddingLeft: '16px', // Adjust padding as needed
          paddingRight: '16px', // Adjust padding as needed
          color:'#6E6C6C',
          fontSize:'24px',
        }}
      />
    </Stack>
  </Stack>
)}
    <Stack direction={'row'}>
    <Button 
      disableElevation 
      disableFocusRipple 
      disableRipple 
      disableTouchRipple
      onClick={handleProfileMenuOpen}
      sx={{
        color: (profileMenuActive && isOpaque ? 'red' : (isOpaque ? 'gray' : (profileMenuActive ? 'red' : (menuActive ? 'gray' : 'gray')))),
        '&:hover': { fontWeight: 700, color: ((isOpaque && (hotelMenuActive || restoranMenuActive || olehOlehMenuActive || wisataMenuActive || profileMenuActive)) ? 'gray' : 'red') },
        padding:'0px',
        minWidth:'auto',
        height:'auto',
        transition: 'color 0.4s ease-in-out',
      }}
    >
      <Icon icon="gg:profile" width="40" height="40" style={{ color: 'inherit' }} />
      <Typography
        sx={{
          alignContent: 'center',
          paddingLeft: '5px',
          paddingRight: '5px',
          paddingTop: '5px',
          fontSize: '22px',
          color: 'inherit',
          fontWeight: 'inherit',
          transition: 'font-weight 0.1s ease-in-out',
          textWrap:'nowrap'
        }}
      >
        {userFullName.length > 12 ? `${userFullName.slice(0, 12)}..` : userFullName}
      </Typography>
    </Button>
    <Menu
                disableScrollLock
                anchorEl={profileAnchorEl}
                open={Boolean(profileAnchorEl)}
                onClose={handleMenuClose}
                elevation={0}
                PaperProps={{
                  style: {
                    background: isOpaque ? 'white' : 'white',
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                    color: isOpaque ? '#6E6C6C' : '#6E6C6C',
                    width:'270px',
                    borderRadius:'0px 0px 30px 30px',
                    transition: 'background 0.2s ease-in-out ',
                  },
                }}
              >
                    <MenuItem onClick={() => handleProfilemenu()} sx={menuItemStyle}>Profile</MenuItem>
                    <Divider />
                    <MenuItem onClick={() => handleLogout()} sx={menuItemStyle}>Sign out</MenuItem>
                </Menu>
              </Stack>
              </Stack>
            )}
          </Stack>
          
        </Toolbar>
        
      </Container>
      <Stack sx={{ backgroundColor: 'white', borderRadius: '0 0 40px 40px', overflowY: 'auto' }} color={'#04214C'} width={'80%'} maxHeight={'calc(100vh - 105px)'} position={'absolute'} top={'105px'}>
      {searchValue && (
        <Typography padding={'30px'} fontSize={'28px'} fontWeight={700}>
          Pencarian
        </Typography>
      )}
      {searchValue && data.hotels && data.hotels.filter(hotel => hotel.nama.toLowerCase().includes(searchValue.toLowerCase())).length > 0 && (
        <>
          <Typography padding={'30px'} fontSize={'28px'} fontWeight={700}>
            Hotel
          </Typography>
          {data.hotels.filter(hotel => hotel.nama.toLowerCase().includes(searchValue.toLowerCase())).map((hotel, index) => (
            <Typography key={index} padding={'0px 30px 30px'} fontSize={'22px'} fontWeight={500}>
              <Link sx={{textDecoration:'none', color:'#04214C'}} onClick={() => navigate(`/cari-hotel?kesiniyuk=${encodeURIComponent(hotel.nama)}`)}>
                {hotel.nama}
              </Link>
            </Typography>
          ))}
        </>
      )}
      {searchValue && data.restoran && data.restoran.filter(restoran => restoran.nama.toLowerCase().includes(searchValue.toLowerCase())).length > 0 && (
        <>
          <Typography padding={'30px'} fontSize={'28px'} fontWeight={700}>
            Restaurant
          </Typography>
          {data.restoran.filter(restoran => restoran.nama.toLowerCase().includes(searchValue.toLowerCase())).map((restoran, index) => (
            <Typography key={index} padding={'0px 30px 30px'} fontSize={'22px'} fontWeight={500}>
              <Link sx={{textDecoration:'none', color:'#04214C'}} onClick={() => navigate(`/cari-restaurant?kesiniyuk=${encodeURIComponent(restoran.nama)}`)}>
                {restoran.nama}
              </Link>
            </Typography>
          ))}
        </>
      )}
      {searchValue && data.oleh && data.oleh.filter(oleh => oleh.nama.toLowerCase().includes(searchValue.toLowerCase())).length > 0 && (
        <>
          <Typography padding={'30px'} fontSize={'28px'} fontWeight={700}>
            Oleh-Oleh
          </Typography>
          {data.oleh.filter(oleh => oleh.nama.toLowerCase().includes(searchValue.toLowerCase())).map((oleh, index) => (
            <Typography key={index} padding={'0px 30px 30px'} fontSize={'22px'} fontWeight={500}>
              <Link sx={{textDecoration:'none', color:'#04214C'}} onClick={() => navigate(`/cari-oleh?kesiniyuk=${encodeURIComponent(oleh.nama)}`)}>
                {oleh.nama}
              </Link>
            </Typography>
          ))}
        </>
      )}
      {searchValue && data.wisata && data.wisata.filter(wisata => wisata.nama.toLowerCase().includes(searchValue.toLowerCase())).length > 0 && (
        <>
          <Typography padding={'30px'} fontSize={'28px'} fontWeight={700}>
            Wisata
          </Typography>
          {data.wisata.filter(wisata => wisata.nama.toLowerCase().includes(searchValue.toLowerCase())).map((wisata, index) => (
            <Typography key={index} padding={'0px 30px 30px'} fontSize={'22px'} fontWeight={500}>
              <Link sx={{textDecoration:'none', color:'#04214C'}} onClick={() => navigate(`/cari-wisata?kesiniyuk=${encodeURIComponent(wisata.nama)}`)}>
                {wisata.nama}
              </Link>
            </Typography>
          ))}
        </>
      )}
      {!searchValue || 
        (
          (data.hotels && data.hotels.filter(hotel => hotel.nama.toLowerCase().includes(searchValue.toLowerCase())).length === 0) &&
          (data.restoran && data.restoran.filter(restoran => restoran.nama.toLowerCase().includes(searchValue.toLowerCase())).length === 0) &&
          (data.oleh && data.oleh.filter(oleh => oleh.nama.toLowerCase().includes(searchValue.toLowerCase())).length === 0) &&
          (data.wisata && data.wisata.filter(wisata => wisata.nama.toLowerCase().includes(searchValue.toLowerCase())).length === 0)
        )
      && (
        <Typography padding={'30px'} fontSize={'22px'} fontWeight={500}>
          Tidak ada yang cocok
        </Typography>
      )}
    </Stack>
    </AppBar>

  );
}
