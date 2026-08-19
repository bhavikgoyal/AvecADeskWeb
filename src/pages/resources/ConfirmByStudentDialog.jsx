import { useState } from 'react';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

import {
  uploadInstallmentDocument,
  sendInstallmentConfirmationEmail,
} from '../../api/schedulesApi';


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => reject(new Error('Failed to read file.'));

    reader.readAsDataURL(file);
  });
}


export default function ConfirmByStudentDialog({
  open,
  installment,
  onClose,
  onConfirmed,
}) {
  const [file, setFile] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');


  const reset = () => {
    setFile(null);
    setDocumentUrl(null);
    setError('');
  };


  const handleClose = () => {
    if (uploading || sending) return;

    reset();
    onClose?.();
  };


  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      return;
    }

    // 10 MB validation
    const maxSize = 10 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setError('File size must be less than or equal to 10MB.');
      setFile(null);
      setDocumentUrl(null);
      return;
    }

    setFile(selectedFile);
    setDocumentUrl(null);
    setError('');
  };


  const handleUpload = async () => {
    if (!installment?.studentPaymentInstallmentId) {
      setError('Installment ID is missing.');
      return;
    }

    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const base64 = await fileToBase64(file);

      const result = await uploadInstallmentDocument({
        studentPaymentInstallmentId:
          installment.studentPaymentInstallmentId,

        fileBase64: base64,

        fileName: file.name,
      });

      const uploadedUrl =
        result?.documentUrl ??
        result?.DocumentUrl ??
        result?.url ??
        result?.Url;

      if (!uploadedUrl) {
        throw new Error('Document uploaded, but document URL was not returned.');
      }

      setDocumentUrl(uploadedUrl);
    } catch (err) {
      setError(
        err?.message || 'Failed to upload document.'
      );
    } finally {
      setUploading(false);
    }
  };


  const handleSendEmail = async () => {
    if (!installment?.studentPaymentInstallmentId) {
      setError('Installment ID is missing.');
      return;
    }

    if (!documentUrl) {
      setError('Please upload a document before sending email.');
      return;
    }

    setSending(true);
    setError('');

    try {
      await sendInstallmentConfirmationEmail(
        installment.studentPaymentInstallmentId
      );

      onConfirmed?.(
        installment,
        documentUrl
      );

      reset();
      onClose?.();
    } catch (err) {
      setError(
        err?.message || 'Failed to send confirmation email.'
      );
    } finally {
      setSending(false);
    }
  };


  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
          >
            Confirm by Student
          </Typography>

          
        </Box>

        <Button
          onClick={handleClose}
          disabled={uploading || sending}
          sx={{
            minWidth: 0,
            p: 0.5,
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>


      <DialogContent>
        {error && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        <Typography
          fontWeight={700}
          sx={{ mb: 0.5 }}
        >
          Upload Document *
        </Typography>
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 40,
              color: 'primary.main',
              mb: 1,
            }}
          />


          <Typography sx={{ mb: 1 }}>
            {file
              ? file.name
              : 'Drag and drop file here'}
          </Typography>


          {file && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          )}


          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            or
          </Typography>


          <Button
            component="label"
            variant="outlined"
            disabled={uploading || sending}
          >
            Choose File

            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
          </Button>
        </Box>


        {(uploading || sending) && (
          <LinearProgress sx={{ mt: 2 }} />
        )}


        <Alert
          severity="info"
          sx={{ mt: 2 }}
        >
          Allowed file types: PDF, DOC, DOCX, JPG, PNG.
          Maximum size: 10MB.
        </Alert>


        {documentUrl && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
          >
            Document uploaded successfully.
            You can now send the email.
          </Alert>
        )}
      </DialogContent>


      <DialogActions
        sx={{
          px: 3,
          pb: 2,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={uploading || sending}
        >
          Cancel
        </Button>


        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          disabled={
            !file ||
            uploading ||
            sending
          }
        >
          {uploading
            ? 'Uploading...'
            : 'Upload'}
        </Button>


        <Button
          variant="contained"
          color="success"
          startIcon={<SendIcon />}
          onClick={handleSendEmail}
          disabled={
            !documentUrl ||
            sending ||
            uploading
          }
        >
          {sending
            ? 'Sending...'
            : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}