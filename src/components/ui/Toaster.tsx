"use client";

import { useEffect, useState } from "react";
import { Toaster as SonnerToaster, ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const [responsiveDuration, setResponsiveDuration] = useState(props.duration || 3000);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setResponsiveDuration(1000);
      } else {
        setResponsiveDuration(props.duration || 3000);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [props.duration]);

  return <SonnerToaster {...props} duration={responsiveDuration} />;
}
