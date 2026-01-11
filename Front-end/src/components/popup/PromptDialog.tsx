import React from 'react';
import { Dialog, DialogContent, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import loginImage from '../../assets/tata-hm.png'; // Import your login image

interface Props {
  open: boolean;
  onClose: () => void;
}

const LoginPromptDialog: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate(); // Initialize navigate function

  const handleLoginClick = () => {
    onClose(); // Close the dialog
    navigate('/login'); // Navigate to the login page
  };

  return (
    <Dialog open={open} onClose={onClose}>
      
      <DialogContent>
        <Stack justifyContent={'center'} alignItems={'center'} gap={2} padding={5}>
        <Typography sx={{
                fontWeight: 700,
                fontSize: '42px',
                color:'#FF010C',
                textAlign:'center'
              }}>Ups! kita lupa kamu siapa 😰</Typography>
          <Typography sx={{
                fontWeight: 700,
                fontSize: '42px',
                color:'#FF010C',
              }}>Mohon Login dulu ya~</Typography>
        <img src={loginImage} alt="Login" style={{ maxWidth: '50%' }} /> 
        <Button
                onClick={handleLoginClick} // Use debounced handleLogin
                sx={{
                  display: 'flex',
                  width: '200px',
                  height: '60px',
                  padding: '10px 20px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '40px',
                  background: '#FF010C',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                  fontWeight: 700,
                  fontSize: '24px',
                  '&:hover': { background: 'white', color: 'red', boxShadow: '0px 0px 0px 2px red',}
                }}
              >            Close
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default LoginPromptDialog;
