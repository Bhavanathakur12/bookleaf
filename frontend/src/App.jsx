import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { MyBooks } from './components/AuthorPortal/MyBooks';
import { MyTickets } from './components/AuthorPortal/MyTickets';
import { SubmitTicketModal } from './components/AuthorPortal/SubmitTicketModal';
import { AdminDashboard } from './components/AdminPortal/AdminDashboard';
import { KnowledgeBaseView } from './components/AdminPortal/KnowledgeBaseView';
import { ApiDocsModal } from './components/ApiDocsModal';
import { api } from './api/client';

export function App() {
  const { user, loading } = useAuth();

  // Navigation tab state
  const [authorTab, setAuthorTab] = useState('books'); // 'books' | 'tickets'
  const [adminTab, setAdminTab] = useState('queue'); // 'queue' | 'kb'

  // Modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitBookId, setSubmitBookId] = useState('general');
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  // Author data cache
  const [authorBooksData, setAuthorBooksData] = useState(null);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const fetchAuthorBooks = async () => {
    if (user?.role === 'author') {
      setLoadingBooks(true);
      try {
        const res = await api.getAuthorBooks();
        setAuthorBooksData(res);
      } catch (err) {
        console.error('Failed to load author books', err);
      } finally {
        setLoadingBooks(false);
      }
    }
  };

  useEffect(() => {
    setAuthorBooksData(null);
    if (user?.role === 'author') {
      fetchAuthorBooks();
      setAuthorTab('books');
    } else if (user?.role === 'admin') {
      setAdminTab('queue');
    }
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
          Loading BookLeaf Portal...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginView />
      </>
    );
  }

  const isAdmin = user.role === 'admin';

  const handleRaiseTicketForBook = (bookId) => {
    setSubmitBookId(bookId);
    setSubmitModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        activeTab={isAdmin ? adminTab : authorTab}
        setActiveTab={isAdmin ? setAdminTab : setAuthorTab}
        onOpenSubmitModal={() => {
          setSubmitBookId('general');
          setSubmitModalOpen(true);
        }}
        onOpenDocsModal={() => setDocsModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="main-content">
        {!isAdmin ? (
          authorTab === 'books' ? (
            <MyBooks
              key={`books-${user.id}`}
              booksData={authorBooksData}
              loading={loadingBooks}
              onRaiseTicketForBook={handleRaiseTicketForBook}
            />
          ) : (
            <MyTickets
              key={`tickets-${user.id}`}
              onOpenSubmitModal={() => {
                setSubmitBookId('general');
                setSubmitModalOpen(true);
              }}
            />
          )
        ) : adminTab === 'queue' ? (
          <AdminDashboard key={`admin-dash-${user.id}`} />
        ) : (
          <KnowledgeBaseView key={`admin-kb-${user.id}`} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <span>BookLeaf Publishing • Author Support Platform</span>
        </div>
      </footer>

      {/* Submit Ticket Modal (Author Portal) */}
      {!isAdmin && (
        <SubmitTicketModal
          isOpen={submitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          books={authorBooksData?.books || []}
          initialBookId={submitBookId}
          onTicketCreated={(ticket) => {
            setAuthorTab('tickets');
          }}
        />
      )}

      {/* API Specification Modal */}
      <ApiDocsModal isOpen={docsModalOpen} onClose={() => setDocsModalOpen(false)} />
    </div>
  );
}

export default App;
