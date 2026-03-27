"use client";
import dynamic from "next/dynamic";
const TestBtn = dynamic(() => import("@/components/pdf/SchoolTicketsPDFButton").then(m => m.SchoolTicketsPDFButton), { ssr: false });
export default function TestPage() {
    return <div><h1>Test PDF</h1><TestBtn schoolName="Test" schoolTickets={[]} /></div>;
}
