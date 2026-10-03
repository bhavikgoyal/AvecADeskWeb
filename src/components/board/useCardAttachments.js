import { useEffect, useState } from 'react';
import {
  addCardAttachmentLink,
  deleteCardAttachment,
  getCardAttachments,
  updateCardAttachment,
  uploadCardAttachment,
} from '../../api/cardAttachmentApi';

export const MAX_ATTACHMENT_BYTES = 25 * 1000 * 1000;

export function useCardAttachments(cardId) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    getCardAttachments(cardId)
      .then((data) => mounted && setAttachments(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load attachments', err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [cardId]);

  // Returns the uploaded attachments (failed files are reported and skipped)
  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    const tooBig = files.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig.length) {
      window.alert(`These files are larger than 25 MB and were skipped:\n${tooBig.map((f) => f.name).join('\n')}`);
    }

    const uploaded = [];
    for (const file of files.filter((f) => f.size <= MAX_ATTACHMENT_BYTES)) {
      setUploadingCount((n) => n + 1);
      try {
        const created = await uploadCardAttachment(cardId, file);
        if (created) {
          uploaded.push(created);
          setAttachments((prev) => [created, ...prev]);
        }
      } catch (err) {
        window.alert(err?.message || `Unable to upload ${file.name}.`);
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
    return uploaded;
  };

  const addLink = async (url, displayName) => {
    try {
      const created = await addCardAttachmentLink({ cardID: cardId, url, displayName });
      if (created) setAttachments((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      window.alert(err?.message || 'Unable to attach link.');
      return false;
    }
  };

  const updateAttachment = async (attachmentId, changes) => {
    try {
      const updated = await updateCardAttachment(attachmentId, changes);
      if (updated) {
        setAttachments((prev) => prev.map((a) => (a.attachmentID === attachmentId ? updated : a)));
      }
      return true;
    } catch (err) {
      window.alert(err?.message || 'Unable to update attachment.');
      return false;
    }
  };

  const removeAttachment = async (attachmentId) => {
    try {
      await deleteCardAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.attachmentID !== attachmentId));
      return true;
    } catch (err) {
      window.alert(err?.message || 'Unable to delete attachment.');
      return false;
    }
  };

  return {
    attachments,
    loading,
    uploading: uploadingCount > 0,
    uploadFiles,
    addLink,
    updateAttachment,
    removeAttachment,
  };
}
