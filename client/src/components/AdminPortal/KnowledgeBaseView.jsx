import React from 'react';
import { BookOpen, Shield, DollarSign, Printer, Globe, GitPullRequest, MessageSquareText } from 'lucide-react';

export function KnowledgeBaseView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>BookLeaf Publishing Knowledge Base &amp; Operating Policies</h2>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          Authoritative policy reference used to ground AI-drafted responses and ops escalation workflows
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Company Overview */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#6366f1' }}>
            <BookOpen size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Company &amp; Facilities</h3>
          </div>
          <ul style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
            <li>Self-publishing company operating in India &amp; US, catalog of 22,000+ titles.</li>
            <li>In-house printing facility and central warehouse in Delhi.</li>
            <li>Partner printing facilities: <strong>Repro India</strong> and <strong>Epitome Books</strong>.</li>
            <li>Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium add-ons).</li>
          </ul>
        </div>

        {/* Royalty Policy */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981' }}>
            <DollarSign size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Royalty &amp; Payout Policy</h3>
          </div>
          <ul style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
            <li><strong>80/20 Profit Split:</strong> 80% net profit to author, 20% to BookLeaf.</li>
            <li><strong>Net Profit Formula:</strong> MRP minus Printing Cost, Platform Commission (Amazon/Flipkart ~45-50%), and Shipping.</li>
            <li><strong>Quarterly Cycle:</strong> Paid within 45 days of quarter ending via direct bank transfer.</li>
            <li><strong>Payout Threshold:</strong> Minimum ₹1,000. Balances below this roll over to the next quarter.</li>
          </ul>
        </div>

        {/* ISBN Policy */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#06b6d4' }}>
            <Shield size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>ISBN &amp; Metadata Policy</h3>
          </div>
          <ul style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
            <li>Every book receives a unique ISBN registered under BookLeaf's publisher imprint.</li>
            <li>Authors desiring their own imprint must obtain ISBNs independently.</li>
            <li><strong>ISBN Discrepancy Escalation:</strong> High priority issue escalated immediately to production with a strict <strong>48-hour SLA</strong>.</li>
          </ul>
        </div>

        {/* Printing & Quality Guarantee */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#f59e0b' }}>
            <Printer size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Printing &amp; Quality Guarantee</h3>
          </div>
          <ul style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
            <li>Standard print turnaround: 5–7 business days from order confirmation.</li>
            <li><strong>Quality Defect Resolution:</strong> Misprints, binding defects, or blurry copy qualify for a <strong>100% free reprint</strong> once photos are reviewed.</li>
            <li>Reprint turnaround: 5–7 business days.</li>
          </ul>
        </div>

        {/* Distribution & Availability */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#ec4899' }}>
            <Globe size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Distribution &amp; Availability</h3>
          </div>
          <ul style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
            <li>Channels: Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.</li>
            <li>New listings typically go live within 7–10 business days after publication is complete.</li>
            <li><strong>Amazon 'Currently Unavailable':</strong> Stock sync feed issue. Operations triggers a catalog re-sync within 24–48 hours.</li>
          </ul>
        </div>

        {/* Production Pipeline */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#8b5cf6' }}>
            <GitPullRequest size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>9 Production Pipeline Stages</h3>
          </div>
          <ol style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5', paddingLeft: '1.25rem' }}>
            <li>Manuscript Received</li>
            <li>Editing (if opted)</li>
            <li>Cover Design (waiting on author approval)</li>
            <li>Typesetting</li>
            <li>Proofreading (revision rounds)</li>
            <li>ISBN Assignment</li>
            <li>Printing</li>
            <li>Distribution Setup</li>
            <li>Published &amp; Live</li>
          </ol>
        </div>
      </div>

      {/* Tone Guidelines */}
      <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#c084fc' }}>
          <MessageSquareText size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Communication Tone Guidelines</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', fontSize: '0.825rem', color: '#e2e8f0' }}>
          <div>• <strong>Empathetic &amp; Professional:</strong> Authors are partners, not customers to be managed.</div>
          <div>• <strong>Be Specific:</strong> Include actual sales numbers, royalty dates, and exact stages.</div>
          <div>• <strong>Own Faults Directly:</strong> No corporate deflection on delayed royalties or print flaws.</div>
          <div>• <strong>Clear 48-Hour SLAs:</strong> Give concrete timelines rather than open-ended promises.</div>
          <div>• <strong>Always End with Next Step:</strong> Tell the author exactly what BookLeaf or they should do next.</div>
        </div>
      </div>
    </div>
  );
}
