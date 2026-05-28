"use client";

/**
 * ChartContainer — wrapper that defers chart rendering until the browser
 * has finished its first layout pass. This prevents Recharts from measuring
 * a zero-size container and logging the width(-1)/height(-1) warning.
 *
 * Usage:
 * <ChartContainer className="h-[300px] w-full">
 * <MyChart />
 * </ChartContainer>
 */

import { useLayoutEffect, useState, useEffect, useRef, ReactNode, CSSProperties } from"react";
import { cn } from"@/lib/utils";

interface ChartContainerProps {
 children: ReactNode;
 className?: string;
 style?: CSSProperties;
 skeleton?: ReactNode;
}

export function ChartContainer({
 children,
 className,
 style,
 skeleton,
}: ChartContainerProps) {
 const [ready, setReady] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 useLayoutEffect(() => {
 // rAF gives the browser one full layout pass before rendering chart
 const id = requestAnimationFrame(() => {
 setReady(true);
 });
 return () => cancelAnimationFrame(id);
 }, []);

 // Suppress Recharts width(-1)/height(-1) warning before chart is ready
 useEffect(() => {
 if (ready) return;
 const original = console.error.bind(console);
 console.error = (...args: unknown[]) => {
 if (
 typeof args[0] ==="string"&&
 args[0].includes("width(-1) and height(-1)")
 ) {
 return;
 }
 original(...args);
 };
 return () => {
 console.error = original;
 };
 }, [ready]);

 return (
 <div ref={ref} className={cn("relative", className)} style={style}>
 {ready ? (
 children
 ) : (
 skeleton ?? (
 <div className="absolute inset-0 bg-muted animate-pulse rounded-xl"/>
 )
 )}
 </div>
 );
}
