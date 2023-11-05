import { Montserrat } from "next/font/google";
const montserrat = Montserrat({ subsets: ["latin"] });

/** App Fonts */
export const fonts = {
  body: montserrat.style.fontFamily,
  heading: montserrat.style.fontFamily,
};