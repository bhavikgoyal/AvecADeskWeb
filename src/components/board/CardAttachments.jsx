import { useRef, useState } from "react";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import LinkIcon from "@mui/icons-material/Link";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { resolveCoverImageUrl } from "../../utils/cardCover";
import {
  BORDER,
  BRAND,
  MUTED_TEXT,
  NEUTRAL_BG,
  SUBTLE_TEXT,
  TEXT,
  dangerButtonStyle,
  formatTrelloDateTime,
  greyButtonStyle,
  inputStyle,
  primaryButtonStyle,
} from "./cardModalStyles";
import { CardPopover, PopoverHeader } from "./cardModalUi";

const FILES_PREVIEW_COUNT = 4;

const fieldLabelStyle = {
  display: "block",
  margin: "12px 0 4px",
  fontSize: 12,
  fontWeight: 700,
  color: SUBTLE_TEXT,
};

const menuItemStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "none",
  borderRadius: 4,
  background: "transparent",
  color: TEXT,
  fontSize: 14,
  fontFamily: "inherit",
  textAlign: "left",
  cursor: "pointer",
  display: "block",
  textDecoration: "none",
  boxSizing: "border-box",
};

function getExtension(attachment) {
  const source =
    attachment.fileName || attachment.displayName || attachment.fileUrl || "";
  const match = /\.([a-z0-9]{1,5})$/i.exec(source.split("?")[0]);
  return match ? match[1].toUpperCase() : "FILE";
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}


export function AttachPopover({
  uploading,
  onUploadFiles,
  onAddLink,
  onClose,
}) {
  const fileInputRef = useRef(null);
  const [url, setUrl] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [saving, setSaving] = useState(false);

  const canInsert = url.trim() !== "" && !saving;

  const handleFiles = async (files) => {
    if (!files?.length) return;
    await onUploadFiles(files);
    onClose();
  };

  const handleInsert = async () => {
    if (!canInsert) return;
    setSaving(true);
    const ok = await onAddLink(url.trim(), displayText.trim());
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div>
      <PopoverHeader title="Attach" onClose={onClose} />

      <div
        style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}
      >
        Attach a file from your computer
      </div>
      <div style={{ fontSize: 12, color: MUTED_TEXT, marginBottom: 8 }}>
        You can also drag and drop files onto the card to upload them.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...greyButtonStyle,
          width: "100%",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Uploading..." : "Choose a file"}
      </button>

      <div style={{ height: 1, background: BORDER, margin: "16px 0 4px" }} />

      <label>
        <span style={fieldLabelStyle}>Search or paste a link *</span>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInsert()}
          placeholder="Paste any link here..."
          style={inputStyle}
        />
      </label>
      <label>
        <span style={fieldLabelStyle}>Display text (optional)</span>
        <input
          value={displayText}
          onChange={(e) => setDisplayText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInsert()}
          placeholder="Text to display"
          style={inputStyle}
        />
      </label>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 16,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{ ...greyButtonStyle, background: "transparent" }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canInsert}
          onClick={handleInsert}
          style={{
            ...primaryButtonStyle,
            opacity: canInsert ? 1 : 0.5,
            cursor: canInsert ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Inserting..." : "Insert"}
        </button>
      </div>
    </div>
  );
}


function AttachmentMenu({
  attachment,
  isCover,
  onUpdate,
  onDelete,
  onMakeCover,
  onRemoveCover,
  onClose,
}) {
  const [view, setView] = useState("menu");
  const [name, setName] = useState(attachment.displayName || "");
  const [link, setLink] = useState(attachment.isLink ? attachment.fileUrl : "");
  const [busy, setBusy] = useState(false);
  const href = resolveCoverImageUrl(attachment.fileUrl);

  const run = async (action) => {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (ok !== false) onClose();
  };

  if (view === "edit") {
    const canSave =
      !busy && name.trim() !== "" && (!attachment.isLink || link.trim() !== "");
    return (
      <div>
        <PopoverHeader
          title="Edit attachment"
          onClose={onClose}
          onBack={() => setView("menu")}
        />
        {attachment.isLink && (
          <label>
            <span style={fieldLabelStyle}>Link</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              style={inputStyle}
            />
          </label>
        )}
        <label>
          <span style={fieldLabelStyle}>
            {attachment.isLink ? "Link name" : "File name"}
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              canSave &&
              run(() =>
                onUpdate({
                  displayName: name.trim(),
                  linkUrl: attachment.isLink ? link.trim() : null,
                }),
              )
            }
            style={inputStyle}
          />
        </label>
        <button
          type="button"
          disabled={!canSave}
          onClick={() =>
            run(() =>
              onUpdate({
                displayName: name.trim(),
                linkUrl: attachment.isLink ? link.trim() : null,
              }),
            )
          }
          style={{
            ...primaryButtonStyle,
            marginTop: 16,
            opacity: canSave ? 1 : 0.5,
          }}
        >
          {busy ? "Saving..." : "Update"}
        </button>
      </div>
    );
  }

  if (view === "delete") {
    return (
      <div>
        <PopoverHeader
          title="Delete attachment?"
          onClose={onClose}
          onBack={() => setView("menu")}
        />
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 14,
            color: TEXT,
            lineHeight: "20px",
          }}
        >
          Are you sure you want to delete this attachment?
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(onDelete)}
          style={{ ...dangerButtonStyle, width: "100%" }}
        >
          {busy ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PopoverHeader
        title={attachment.isLink ? "Link actions" : "Attachment actions"}
        onClose={onClose}
      />
      <button
        type="button"
        style={menuItemStyle}
        onClick={() => setView("edit")}
      >
        Edit
      </button>
      {!attachment.isLink && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          download={attachment.fileName || true}
          style={menuItemStyle}
          onClick={onClose}
        >
          Download
        </a>
      )}
      {attachment.isImage &&
        (isCover ? (
          <button
            type="button"
            disabled={busy}
            style={menuItemStyle}
            onClick={() => run(onRemoveCover)}
          >
            Remove cover
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            style={menuItemStyle}
            onClick={() => run(onMakeCover)}
          >
            Make cover
          </button>
        ))}
      <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
      <button
        type="button"
        style={{ ...menuItemStyle, color: "#AE2E24" }}
        onClick={() => setView("delete")}
      >
        Delete
      </button>
    </div>
  );
}


export function CardAttachmentsSection({
  attachments,
  coverImageUrl,
  onAddClick,
  onUpdate,
  onDelete,
  onMakeCover,
  onRemoveCover,
}) {
  const [menu, setMenu] = useState({
    anchorEl: null,
    attachment: null,
    position: null,
  });

  const [showAllFiles, setShowAllFiles] = useState(false);

  const links = attachments.filter((a) => a.isLink);
  const files = attachments.filter((a) => !a.isLink);

  const visibleFiles = showAllFiles
    ? files
    : files.slice(0, FILES_PREVIEW_COUNT);

  const closeMenu = () =>
    setMenu({
      anchorEl: null,
      attachment: null,
      position: null,
    });

  const isCover = (a) => !!coverImageUrl && a.fileUrl === coverImageUrl;

  const moreButton = (attachment) => (
    <button
      type="button"
      aria-label="Attachment actions"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const dialog = e.currentTarget.closest('[role="dialog"]');
        const dialogRect = dialog?.getBoundingClientRect();

        const popupWidth = 304;
        const popupHeight = 220;
        const gap = 12;

        let left = rect.right - popupWidth;
        let top = rect.bottom + gap;

        if (dialogRect) {
          left = Math.min(left, dialogRect.right - popupWidth - gap);

          left = Math.max(left, dialogRect.left + gap);

          const spaceBelow = dialogRect.bottom - rect.bottom - gap;

          if (spaceBelow < popupHeight) {
            top = rect.top - popupHeight - gap;
          }

          top = Math.max(
            dialogRect.top + gap,
            Math.min(top, dialogRect.bottom - popupHeight - gap),
          );
        }

        setMenu({
          anchorEl: e.currentTarget,
          attachment,
          position: {
            top,
            left,
          },
        });
      }}
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        border: "none",
        borderRadius: 4,
        background: NEUTRAL_BG,
        color: SUBTLE_TEXT,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <MoreHorizIcon sx={{ fontSize: 18 }} />
    </button>
  );

  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: 32,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 20,
            display: "flex",
            justifyContent: "center",
            color: SUBTLE_TEXT,
            flexShrink: 0,
          }}
        >
          <AttachFileIcon sx={{ fontSize: 20 }} />
        </span>

        <h3
          style={{
            flex: 1,
            minWidth: 0,
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: TEXT,
          }}
        >
          Attachments
        </h3>

        <button type="button" onClick={onAddClick} style={greyButtonStyle}>
          Add
        </button>
      </div>

      <div style={{ paddingLeft: 32 }}>
        {links.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: SUBTLE_TEXT,
                marginBottom: 8,
              }}
            >
              Links
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {links.map((link) => (
                <div
                  key={link.attachmentID}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 6px 6px 10px",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <LinkIcon
                    sx={{
                      fontSize: 18,
                      color: SUBTLE_TEXT,
                      flexShrink: 0,
                    }}
                  />

                  <a
                    href={link.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={link.fileUrl}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: BRAND,
                      fontSize: 14,
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {link.displayName || link.fileUrl}

                    {link.displayName && link.displayName !== link.fileUrl && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          color: MUTED_TEXT,
                        }}
                      >
                        {getHost(link.fileUrl)}
                      </span>
                    )}
                  </a>

                  {moreButton(link)}
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: SUBTLE_TEXT,
                marginBottom: 8,
              }}
            >
              Files
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {visibleFiles.map((file) => {
                const href = resolveCoverImageUrl(file.fileUrl);
                const cover = isCover(file);

                return (
                  <div
                    key={file.attachmentID}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      title={file.displayName}
                      style={{
                        width: 64,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: 4,
                        background: file.isImage
                          ? `center / cover no-repeat url("${href}"), ${NEUTRAL_BG}`
                          : NEUTRAL_BG,
                        color: SUBTLE_TEXT,
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      {!file.isImage && getExtension(file)}
                    </a>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "block",
                          color: TEXT,
                          fontSize: 14,
                          fontWeight: 600,
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.displayName}
                      </a>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: MUTED_TEXT,
                        }}
                      >
                        <span>
                          Added {formatTrelloDateTime(file.createdAt)}
                        </span>

                        {file.fileSize ? (
                          <span>• {formatFileSize(file.fileSize)}</span>
                        ) : null}

                        {cover && (
                          <span
                            style={{
                              padding: "0 6px",
                              borderRadius: 3,
                              background: NEUTRAL_BG,
                              color: SUBTLE_TEXT,
                              fontWeight: 600,
                            }}
                          >
                            Cover
                          </span>
                        )}
                      </div>
                    </div>

                    {moreButton(file)}
                  </div>
                );
              })}
            </div>

            {files.length > FILES_PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllFiles((v) => !v)}
                style={{
                  ...greyButtonStyle,
                  marginTop: 12,
                }}
              >
                {showAllFiles
                  ? "Show fewer attachments"
                  : `View all attachments (${files.length - FILES_PREVIEW_COUNT} hidden)`}
              </button>
            )}
          </div>
        )}
      </div>

      {menu.attachment && menu.position && (
        <div
          style={{
            position: "fixed",
            top: menu.position.top,
            left: menu.position.left,
            width: 304,
            boxSizing: "border-box",
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(9,30,66,0.2)",
            padding: 8,
            zIndex: 1400,
          }}
        >
          <AttachmentMenu
            key={menu.attachment.attachmentID}
            attachment={menu.attachment}
            isCover={isCover(menu.attachment)}
            onUpdate={(changes) =>
              onUpdate(menu.attachment.attachmentID, changes)
            }
            onDelete={() => onDelete(menu.attachment)}
            onMakeCover={() => onMakeCover(menu.attachment)}
            onRemoveCover={onRemoveCover}
            onClose={closeMenu}
          />
        </div>
      )}
    </section>
  );
}
