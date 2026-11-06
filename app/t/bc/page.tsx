import type { Metadata } from "next";
import BcApp from "@/components/BcApp";

export const metadata: Metadata = {
  title: "Bibel-Challenge",
  robots: { index: false, follow: false },
};

export default function BcPage() {
  return <BcApp />;
}