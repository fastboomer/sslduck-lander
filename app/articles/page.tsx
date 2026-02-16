import Header from '../components/Header';
import { OmniFeed } from '../components/OmniFeed';
import { Footer } from '../components/Footer';

export default function ArticlesPage() {
    return (
        <main className="min-h-screen bg-background pt-20">
            <Header />
            <OmniFeed />
            <Footer />
        </main>
    );
}
