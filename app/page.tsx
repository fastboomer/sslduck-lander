import Header from './components/Header';
import { Hero } from './components/Hero';
import { ResumeOfferCard } from './components/ResumeOfferCard';
import { SuccessStories } from './components/SuccessStories';
import { Footer } from './components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">

      <Header />
      <Hero />
      <ResumeOfferCard />
      <SuccessStories />
      <Footer />
    </main>
  );
}
