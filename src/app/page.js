import Head from 'next/head';
import TranslationForm from '../components/TranslationForm';

const Home = () => (
  <main className="bg-gray-200 min-h-screen">
    <Head>
      <title>Property File Translation</title>
    </Head>
    <div className="flex items-center justify-center min-h-screen">
      <TranslationForm />
    </div>
  </main>
);

export default Home;
