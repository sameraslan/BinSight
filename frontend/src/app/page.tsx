'use client';

import { Center, Image } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push('/capture');
  };

  return (
    <Center height="100vh" onClick={handleLogoClick} cursor="pointer">
      <Image
        src="/binsightlogo.png"
        objectFit="contain"
        alt="Binsight Logo"
      />
    </Center>
  );
}
