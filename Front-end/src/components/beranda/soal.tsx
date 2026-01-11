// src/components/beranda/soal.tsx
import React, { useEffect, useState } from 'react';
import {
  Card,
  Stack,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  CardHeader,
  CardContent,
  IconButton,
  Tooltip,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import { InlineMath } from 'react-katex';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';

interface Option {
  id: string;
  text: string;
}
interface TableCellData {
  value: string;
  colspan?: number;
  rowspan?: number;
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
  image?: string;
  table?: {
    headers: string | string[];
    rows: string | (string | TableCellData)[][];
  };
}

interface QuestionFormProps {
  questions: Question[];
  selectedQuestionId?: number;
  answers: Record<number, string>;
  onAnswerChange: (questionId: number, answerId: string) => void;
  flaggedQuestions: number[];
  onToggleFlag: (id: number) => void;
  fontSize: 'small' | 'normal' | 'large';
  currentAttemptId?: { tryoutId: string; attemptNumber: number };
  registerQuestionRef?: (id: number, el: HTMLDivElement | null) => void;
}

interface ThemeFromDB {
  palette: keyof typeof tokensSet;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const getFontSize = (size: 'small' | 'normal' | 'large') => {
  switch (size) {
    case 'small':
      return 14;
    case 'normal':
      return 16;
    case 'large':
      return 18;
    default:
      return 16;
  }
};

const parseTable = (table?: { headers: string | string[]; rows: string | (string | TableCellData)[][] }) => {
  if (!table || !table.headers || !table.rows) return undefined;

  const headersArray = Array.isArray(table.headers) ? table.headers : table.headers.split('|');

  const rowsArray = Array.isArray(table.rows)
    ? table.rows
    : table.rows.split(';').map((rowStr) =>
        rowStr.split('|').map((cellStr) => {
          const [value, colspan] = cellStr.split('^');
          return colspan ? { value, colspan: parseInt(colspan, 10) } : value;
        })
      );

  return { headers: headersArray, rows: rowsArray };
};

const parseTextWithMath = (text: string) => {
  const parts = text.split(/(\$\$.*?\$\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const mathContent = part.slice(2, -2);
      return <InlineMath key={idx} math={mathContent} />;
    }
    // handle newline
    return part.split('\n').map((line, i) => (
      <span key={`${idx}-${i}`}>
        {line}
        <br />
      </span>
    ));
  });
};

const QuestionForm: React.FC<QuestionFormProps> = ({
  questions,
  selectedQuestionId,
  answers,
  onAnswerChange,
  flaggedQuestions,
  onToggleFlag,
  fontSize,
  registerQuestionRef,
}) => {
  const [themePalette, setThemePalette] = useState(tokensSet.palette1);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get<ThemeFromDB>(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.palette && tokensSet[res.data.palette]) {
          setThemePalette(tokensSet[res.data.palette]);
        }
      } catch (err) {
        console.error('Gagal ambil tema', err);
      }
    };

    void fetchTheme();
  }, []);

  const visibleQuestions = selectedQuestionId ? questions.filter((q) => q.id === selectedQuestionId) : questions;

  return (
    <Stack spacing={1} sx={{ width: '100%', height: '100%' }}>
      {visibleQuestions.map((q) => {
        const soalNumber = questions.findIndex((x) => x.id === q.id) + 1;
        const isFlagged = flaggedQuestions.includes(q.id);
        const currentFontSize = getFontSize(fontSize);
        const parsedTable = parseTable(q.table);

        const handleFlagClick = () => {
          onToggleFlag(q.id);
        };

        return (
          <div
            key={q.id}
            data-qid={q.id}
            ref={(el) => {
              if (registerQuestionRef) registerQuestionRef(q.id, el);
            }}
          >
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 2,
                backgroundColor: themePalette.primaryContrastText,
                mb: 1,
              }}
            >
              <CardHeader
                sx={{ backgroundColor: themePalette.primaryDark, py: 1 }}
                title={
                  <Typography variant="subtitle1" fontWeight="bold" color={themePalette.primaryContrastText} fontSize={'18px'}>
                    Soal {soalNumber}
                  </Typography>
                }
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={isFlagged ? 'Unflag soal ini' : 'Flag soal ini'} arrow>
                      <IconButton
                        size="small"
                        onClick={handleFlagClick}
                        sx={{
                          color: isFlagged ? themePalette.error : themePalette.primaryContrastText,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                          fontWeight: '700',
                          fontFamily: 'poppins',
                        }}
                      >
                        Tandai soal : <FlagIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />

              <CardContent>
                <Typography variant="body1" sx={{ mb: 2, fontSize: currentFontSize, color: themePalette.btnSecondaryText, fontWeight:'500' }}>
                  {parseTextWithMath(q.text)}
                </Typography>

                {q.image && (
                  <Box
                    sx={{
                      width: { xs: '100%', sm: '100%', md: '400px', lg: '450px', xl: '500px' },
                      mb: 2,
                      textAlign: 'center',
                    }}
                  >
                    <img src={q.image} alt={`Soal ${soalNumber}`} style={{ maxWidth: '100%', borderRadius: 8 }} />
                  </Box>
                )}

                {parsedTable && (
                  <Box sx={{ mb: 2, overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {parsedTable.headers.map((header, idx2) => (
                            <TableCell key={idx2} sx={{ fontWeight: 'bold', color: themePalette.btnSecondaryText }}>
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedTable.rows.map((row, rIdx) => (
                          <TableRow key={rIdx}>
                            {row.map((cell, cIdx) =>
                              typeof cell === 'string' ? (
                                <TableCell key={cIdx} sx={{ color: themePalette.btnSecondaryText }}>
                                  {cell}
                                </TableCell>
                              ) : (
                                <TableCell key={cIdx} colSpan={cell.colspan || 1} sx={{ textAlign: 'center', color: themePalette.btnSecondaryText }}>
                                  {cell.value}
                                </TableCell>
                              )
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}

            <RadioGroup value={answers[q.id] || ''} onChange={(e) => onAnswerChange(q.id, e.target.value)}>
  {q.options.map((opt) => (
    <FormControlLabel
      key={opt.id}
      value={opt.id}
      control={
        <Radio
          sx={{
            color: themePalette.primaryLight, // warna default
            '&.Mui-checked': {
              color: themePalette.primaryDark, // warna saat dipilih
            },
          }}
        />
      }
      label={
        <Typography sx={{ fontSize: currentFontSize, color: themePalette.btnSecondaryText, fontWeight:'500'  }}>
          {parseTextWithMath(opt.text)}
        </Typography>
      }
    />
  ))}
</RadioGroup>

              </CardContent>
            </Card>
          </div>
        );
      })}
    </Stack>
  );
};

export default QuestionForm;
