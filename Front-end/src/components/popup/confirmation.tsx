import React from 'react';
import { Dialog, DialogContent, Button, Stack, Typography } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (confirmed: boolean) => void; // Modify onConfirm to accept boolean parameter
}

const LoginPromptDialog: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  const handleYesClick = () => {
    onClose();
    onConfirm(true); // Pass true to indicate confirmation
  };

  const handleNoClick = () => {
    onClose();
    onConfirm(false); // Pass false to indicate cancellation
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <Stack justifyContent={'center'} alignItems={'center'} gap={2} padding={5}>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '42px',
            color: '#FF010C',
            textAlign: 'center'
          }}>Ups! kita lupa kamu siapa 😰</Typography>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '42px',
            color: '#FF010C',
          }}>Mohon Login dulu ya~</Typography>
          <Stack direction={'row'} gap={5}>
            <Button
              onClick={handleNoClick}
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
                '&:hover': { background: 'white', color: 'red', boxShadow: '0px 0px 0px 2px red', }
              }}
            >
              No
            </Button>
            <Button
              onClick={handleYesClick}
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
                '&:hover': { background: 'white', color: 'red', boxShadow: '0px 0px 0px 2px red', }
              }}
            >
              Yes
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default LoginPromptDialog;
