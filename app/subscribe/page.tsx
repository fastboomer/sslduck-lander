import React from 'react';
import Header from '../components/Header';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { Footer } from '../components/Footer';

export default function SubscribePage() {
    return (
        <main className="min-h-screen">
            <Header />
            <div className="pt-28">
                <NewsletterSignup />
            </div>
            <Footer />
        </main>
    );
}
