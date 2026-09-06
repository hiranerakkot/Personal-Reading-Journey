'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';

type Book = { id: string; title: string; authors: string[]; cover: string | null; description: string; year?: number };
type SavedBook = Book & { status: 'favourite' | 'currently_reading' | 'list' | 'read' };

const KEY = 'personal-reading-journey-books';
function coverFor(id: string) { return `https://covers.openlibrary.org/b/olid/${id}-M.jpg`; }
function cleanDescription(value: any): string {
  if (typeof value === 'string') return value;
  if (value?.value) return value.value;
  return '';
}

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState<SavedBook[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [details, setDetails] = useState<Book | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setBooks(JSON.parse(raw));
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserEmail(data.user.email ?? null);
      supabase.from('user_books').select('*').then(({ data: rows }) => {
        if (rows) setBooks(rows.map((r: any) => ({ id: r.external_id, title: r.title, authors: r.authors ?? [], cover: r.cover_url, description: r.description ?? '', status: r.status })));
      });
    });
  }, [router, supabase]);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(books)); }, [books]);

  async function search() {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_edition_key,first_publish_year`);
      const data = await response.json();
      setResults((data.docs ?? []).filter((b: any) => b.title).map((b: any) => ({
        id: b.key?.replace('/works/', '') || b.cover_edition_key || crypto.randomUUID(), title: b.title,
        authors: b.author_name ?? [], cover: b.cover_edition_key ? coverFor(b.cover_edition_key) : null,
        description: '', year: b.first_publish_year
      })));
    } finally { setLoading(false); }
  }

  async function getDetails(book: Book) {
    setDetailLoading(book.id);
    try {
      const response = await fetch(`https://openlibrary.org/works/${book.id}.json`);
      if (!response.ok) throw new Error('No details');
      const data = await response.json();
      setDetails({ ...book, description: cleanDescription(data.description) || 'No description is available for this edition.' });
    } catch { setDetails({ ...book, description: 'No description is available for this book.' }); }
    finally { setDetailLoading(null); }
  }

  async function add(book: Book, status: SavedBook['status']) {
    let complete = book;
    if (!book.description) {
      try {
        const response = await fetch(`https://openlibrary.org/works/${book.id}.json`);
        if (response.ok) { const data = await response.json(); complete = { ...book, description: cleanDescription(data.description) }; }
      } catch { /* keep search metadata */ }
    }
    setBooks(prev => prev.some(b => b.id === complete.id && b.status === status) ? prev : [...prev, { ...complete, status }]);
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user) await supabase.from('user_books').upsert({ user_id: data.user.id, external_id: complete.id, title: complete.title, authors: complete.authors, cover_url: complete.cover, description: complete.description, status }, { onConflict: 'user_id,external_id,status' });
    }
  }

  async function remove(book: SavedBook) {
    setBooks(prev => prev.filter(b => !(b.id === book.id && b.status === book.status)));
    if (supabase) { const { data } = await supabase.auth.getUser(); if (data.user) await supabase.from('user_books').delete().match({ user_id: data.user.id, external_id: book.id, status: book.status }); }
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); localStorage.removeItem(KEY); router.push('/login'); }

  const section = (status: SavedBook['status'], label: string) => {
    const items = books.filter(b => b.status === status);
    return <section className="section"><div className="section-title">{label}</div>{items.length ? <div className="book-grid">{items.map(b => <article className="book-card" key={`${b.id}-${b.status}`}><button className="cover-button" onClick={() => setDetails(b)} aria-label={`View ${b.title}`}><img className="cover" src={b.cover || '/placeholder.svg'} alt={b.title} /></button><div className="book-title" title={b.title}>{b.title}</div><div className="card-actions"><button className="mini" onClick={() => remove(b)}>Remove</button></div></article>)}</div> : <div className="empty">No books here yet.</div>}</section>;
  };

  return <main className="page"><div className="shell">
    <header className="topbar"><div className="brand">Personal Book Journey</div><button className="logout" onClick={logout}>{userEmail ? 'logout' : 'login'}</button></header>
    <div className="stats"><div><div className="stat-label">total books read</div><div className="stat-value">{books.filter(b => b.status === 'read').length}</div></div><div><div className="stat-label">favourites</div><div className="stat-value">{books.filter(b => b.status === 'favourite').length}</div></div><div><div className="stat-label">list</div><div className="stat-value">{books.filter(b => b.status === 'list').length}</div></div></div>
    <div className="search-wrap"><input className="search" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(); }} aria-label="Search books" /></div>
    {query && <div className="search-results">{loading ? <div className="empty">Searching Open Library…</div> : results.length ? results.map(book => <article className="result" key={book.id}><img className="result-cover" src={book.cover || '/placeholder.svg'} alt="" /><div className="result-info"><div className="result-title">{book.title}</div><div className="muted">{book.authors.join(', ') || 'Unknown author'}{book.year ? ` · ${book.year}` : ''}</div><div className="actions"><button className="action" onClick={() => getDetails(book)}>{detailLoading === book.id ? 'Loading…' : 'Description'}</button><button className="action" onClick={() => add(book, 'favourite')}>Favourite</button><button className="action" onClick={() => add(book, 'currently_reading')}>Currently Reading</button><button className="action" onClick={() => add(book, 'list')}>Add to List</button><button className="action" onClick={() => add(book, 'read')}>Mark Read</button></div></div></article>) : <div className="empty">Press Enter to search for books.</div>}</div>}
    {section('currently_reading', 'Currently Reading')}
    {section('read', 'Already Read')}
    {section('favourite', 'Favourites')}
    {section('list', 'My List')}
    {details && <div className="modal-backdrop" onClick={() => setDetails(null)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setDetails(null)}>×</button><img className="detail-cover" src={details.cover || '/placeholder.svg'} alt={details.title} /><div><h2>{details.title}</h2><div className="muted">{details.authors.join(', ') || 'Unknown author'}</div>{details.year && <div className="muted">Published {details.year}</div>}<p>{details.description || 'Loading description…'}</p></div></div></div>}
  </div></main>;
}
