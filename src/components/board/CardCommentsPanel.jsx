import { useEffect, useRef, useState } from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import {
  createCardComment,
  deleteCardComment,
  getCardActivity,
  getCardComments,
  updateCardComment,
} from '../../api/cardCommentApi';
import {
  BORDER,
  MUTED_TEXT,
  SUBTLE_TEXT,
  TEXT,
  formatTrelloDateTime,
  greyButtonStyle,
  primaryButtonStyle,
} from './cardModalStyles';
import { Avatar, LinkifiedText } from './cardModalUi';

const bubbleStyle = {
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 1px 1px #091E4240, 0 0 1px #091E424F',
  padding: '8px 12px',
  fontSize: 14,
  lineHeight: '20px',
  color: TEXT,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const textareaStyle = {
  width: '100%',
  minHeight: 72,
  padding: '8px 12px',
  border: `1px solid #8590A2`,
  borderRadius: 8,
  fontSize: 14,
  lineHeight: '20px',
  color: TEXT,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  resize: 'vertical',
  outline: 'none',
  background: '#fff',
};

const linkButtonStyle = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: 12,
  color: SUBTLE_TEXT,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function getMentionHandle(comment) {
  const userName = (comment.userName || '').trim();
  if (userName && !/[\s@]/.test(userName)) return userName;
  return (comment.displayName || userName || 'user').replace(/[^\w.-]/g, '');
}

function describeActivity(activity) {
  const description = activity.activityDescription || '';
  switch (activity.activityType) {
    case 'updateCheckItemStateOnCard':
      return (
        <>
          marked <strong>{description}</strong>{' '}
          {String(activity.newValue).toLowerCase() === 'complete' ? 'complete' : 'incomplete'} on this card
        </>
      );
    case 'cardChecklistAdded':
      return (
        <>
          added <strong>{description}</strong> to this card
        </>
      );
    case 'cardChecklistRemoved':
      return (
        <>
          removed <strong>{description}</strong> from this card
        </>
      );
    case 'cardDueDateChanged':
      return activity.newValue ? (
        <>
          changed the due date of this card to <strong>{formatTrelloDateTime(activity.newValue)}</strong>
        </>
      ) : (
        'changed the due date of this card'
      );
    case 'cardDueDateRemoved':
      return 'removed the due date from this card';
    case 'cardAttachmentAdded':
      return (
        <>
          attached <strong>{description}</strong> to this card
        </>
      );
    case 'cardAttachmentDeleted':
      return (
        <>
          deleted the <strong>{description}</strong> attachment from this card
        </>
      );
    case 'cardMoved':
      return activity.oldValue && activity.newValue ? (
        <>
          moved this card from <strong>{activity.oldValue}</strong> to <strong>{activity.newValue}</strong>
        </>
      ) : (
        'moved this card'
      );
    case 'cardMemberAdded':
      return (
        <>
          added <strong>{description}</strong> to this card
        </>
      );
    case 'cardMemberRemoved':
      return (
        <>
          removed <strong>{description}</strong> from this card
        </>
      );
    case 'cardRenamed':
      return (
        <>
          renamed this card from <strong>{activity.oldValue}</strong> to <strong>{activity.newValue}</strong>
        </>
      );
    default:
      return description || activity.activityType || 'updated this card';
  }
}

function CommentEditor({ initialText = '', saving, autoFocus, onSave, onCancel, saveLabel = 'Save' }) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef(null);
  const canSave = !saving && text.trim() !== '' && text.trim() !== initialText.trim();

  // Reply prefill ("@name ") ke baad cursor end par rahe
  useEffect(() => {
    const el = textareaRef.current;
    if (autoFocus && el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [autoFocus]);

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSave) onSave(text.trim());
        }}
        placeholder="Write a comment..."
        style={textareaStyle}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(text.trim())}
          style={{ ...primaryButtonStyle, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
        <button type="button" onClick={onCancel} style={{ ...greyButtonStyle, background: 'transparent' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CardCommentsPanel({ cardId, activityVersion = 0 }) {
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getCardComments(cardId)
      .then((data) => {
        if (!mounted) return;
        setComments(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => {
        console.error('Failed to load comments', err);
        if (mounted) setError('Comments could not be loaded.');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [cardId]);

  useEffect(() => {
    if (!showDetails) return;
    let mounted = true;
    getCardActivity(cardId)
      .then((data) => mounted && setActivity(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load activity', err))
      .finally(() => mounted && setActivityLoaded(true));
    return () => {
      mounted = false;
    };
  }, [cardId, showDetails, activityVersion]);

  const handleCreate = async (text) => {
    setSaving(true);
    try {
      const created = await createCardComment(cardId, text);
      if (created) setComments((prev) => [created, ...prev]);
      setComposerOpen(false);
      setReplyingToId(null);
    } catch (err) {
      window.alert(err?.message || 'Unable to add comment.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (commentId, text) => {
    setSaving(true);
    try {
      const updated = await updateCardComment(commentId, cardId, text);
      if (updated) setComments((prev) => prev.map((c) => (c.commentID === commentId ? updated : c)));
      setEditingId(null);
    } catch (err) {
      window.alert(err?.message || 'Unable to update comment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment? There is no undo.')) return;
    try {
      await deleteCardComment(commentId);
      setComments((prev) => prev.filter((c) => c.commentID !== commentId));
    } catch (err) {
      window.alert(err?.message || 'Unable to delete comment.');
    }
  };

  const feed = [
    ...comments.map((c) => ({ kind: 'comment', key: `c-${c.commentID}`, time: c.createdAt, item: c })),
    ...(showDetails
      ? activity.map((a) => ({ kind: 'activity', key: `a-${a.activityID}`, time: a.createdAt, item: a }))
      : []),
  ].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEXT }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: SUBTLE_TEXT }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Comments and activity</span>
        </div>
        <button type="button" onClick={() => setShowDetails((v) => !v)} style={greyButtonStyle}>
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {composerOpen ? (
        <CommentEditor
          autoFocus
          saving={saving}
          onSave={handleCreate}
          onCancel={() => setComposerOpen(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          style={{
            height: 36,
            padding: '0 12px',
            textAlign: 'left',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            background: '#fff',
            color: MUTED_TEXT,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'text',
            boxShadow: '0 1px 1px #091E4214',
          }}
        >
          Write a comment...
        </button>
      )}

      {loading && <p style={{ margin: 0, fontSize: 13, color: SUBTLE_TEXT }}>Loading comments...</p>}
      {error && <p style={{ margin: 0, fontSize: 13, color: '#C9372C' }}>{error}</p>}
      {!loading && !error && feed.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: SUBTLE_TEXT }}>No comments yet.</p>
      )}
      {showDetails && (
        <p style={{ margin: 0, fontSize: 12, color: MUTED_TEXT }}>
          {!activityLoaded
            ? 'Loading activity...'
            : activity.length === 0
              ? 'No activity for this card yet.'
              : `Showing ${activity.length} activit${activity.length === 1 ? 'y' : 'ies'} with comments.`}
        </p>
      )}

      {feed.map(({ kind, key, item }) =>
        kind === 'comment' ? (
          <div key={key} style={{ display: 'flex', gap: 8 }}>
            <Avatar name={item.displayName} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                <strong style={{ fontSize: 14, color: TEXT }}>{item.displayName}</strong>
                <span style={{ fontSize: 12, color: '#0C66E4', textDecoration: 'underline' }}>
                  {formatTrelloDateTime(item.createdAt)}
                </span>
                {item.isEdited && <span style={{ fontSize: 12, color: MUTED_TEXT }}>(edited)</span>}
              </div>

              {editingId === item.commentID ? (
                <CommentEditor
                  autoFocus
                  initialText={item.commentText}
                  saving={saving}
                  onSave={(text) => handleUpdate(item.commentID, text)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div style={bubbleStyle}>
                    <LinkifiedText text={item.commentText} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setReplyingToId(item.commentID);
                      }}
                      style={linkButtonStyle}
                    >
                      Reply
                    </button>
                    {item.canEdit && (
                      <>
                        <span style={{ fontSize: 12, color: MUTED_TEXT }}>•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setEditingId(item.commentID);
                          }}
                          style={linkButtonStyle}
                        >
                          Edit
                        </button>
                        <span style={{ fontSize: 12, color: MUTED_TEXT }}>•</span>
                        <button type="button" onClick={() => handleDelete(item.commentID)} style={linkButtonStyle}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                  {replyingToId === item.commentID && (
                    <div style={{ marginTop: 8 }}>
                      <CommentEditor
                        key={`reply-${item.commentID}`}
                        autoFocus
                        initialText={`@${getMentionHandle(item)} `}
                        saving={saving}
                        onSave={handleCreate}
                        onCancel={() => setReplyingToId(null)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div key={key} style={{ display: 'flex', gap: 8 }}>
            <Avatar name={item.displayName} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: '20px', color: TEXT }}>
              <strong>{item.displayName}</strong> {describeActivity(item)}
              <div style={{ fontSize: 12, color: '#0C66E4', textDecoration: 'underline' }}>
                {formatTrelloDateTime(item.createdAt)}
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
