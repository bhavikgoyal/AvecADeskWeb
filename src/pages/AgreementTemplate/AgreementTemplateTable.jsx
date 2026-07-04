import React from 'react';
import { Link } from 'react-router-dom';
import './styles.css';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default function AgreementTemplateTable({ templates = [], onDelete }) {
  return (
    <div className="tableWrap">
      <table className={`table table-striped table`}>
        <thead className="thead">
          <tr>
            <th className="rollCell">#</th>
            <th style={{ minWidth: 220 }}>Template Name</th>
            <th style={{ minWidth: 80 }}></th>
            <th style={{ minWidth: 160 }}>Category</th>
            <th style={{ minWidth: 360 }}>Subject / Body</th>
            <th style={{ minWidth: 120 }}>Updated</th>
            <th style={{ minWidth: 120 }}>Created By</th>
            <th style={{ minWidth: 80 }}>Active</th>
            <th style={{ width: 160 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {templates.length === 0 && <tr><td colSpan={7}>No templates found.</td></tr>}
          {templates.map((t, idx) => (
            <tr key={t.templateId}>
              <td className="rollCell">{idx + 1}</td>
              <td style={{ verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>{t.templateName}</div>
                </div>
              </td>
              <td></td>
              <td className="rowTitle">{t.agreementType}</td>
              <td className="preview">
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t.templateName}</div>
                <div style={{ color: '#444' }}>{t.bodyHtml ? stripHtml(t.bodyHtml).slice(0, 180) + (stripHtml(t.bodyHtml).length > 180 ? '...' : '') : <em>No content</em>}</div>
              </td>
              <td className="rowTitle">{t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}</td>
              <td className="rowTitle">{t.createdByUserId}</td>
              <td className="rowTitle">{t.isActive ? 'Yes' : 'No'}</td>
              <td className="actions">
                <Link to={`/agreement-template/${t.templateId}/edit`} className={`actionBtn editBtn`}>✎</Link>
                <button className={`actionBtn deleteBtn`} onClick={() => onDelete && onDelete(t.templateId)}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
