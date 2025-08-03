'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function withAuth(Component: any, role?: string) {
  return function WithAuth(props: any) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === "loading") return; // Do nothing while loading
      if (!session) router.push("/login"); // Redirect if not authenticated
      if (role && session?.user?.role !== role) router.push("/unauthorized"); // Redirect if not authorized
    }, [session, status]);

    if (session) {
      return <Component {...props} />;
    }

    return null;
  };
}