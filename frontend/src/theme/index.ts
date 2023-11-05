import {  extendTheme } from "@chakra-ui/react";
import { fonts } from "./fonts";
import { colors } from "./colors";

export const theme = extendTheme({
  colors, 
  styles: {
    global: {
      // styles for the `body`
      body: {
        bg: colors.primary[700],
        color: colors.text[700], 
      },
    },
  },
  fonts,
  components: {
  /** Customize Chakra UI Components */
  },
});