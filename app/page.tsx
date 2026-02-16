import Header from './components/Header';
import { Hero } from './components/Hero';
import { ResumeOfferCard } from './components/ResumeOfferCard';
import { Footer } from './components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="fixed bottom-4 left-4 bg-black text-white px-2 py-1 text-[8px] z-[9999] opacity-50 font-mono">v12-PRO-ACTIVE</div>
      <Header />
      <Hero />
      <ResumeOfferCard />
      <Footer />
    </main>
  );
}
