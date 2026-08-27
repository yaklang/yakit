import type { SVGProps } from 'react'

/** Power/exit icon retained locally because the package has no geometry-equivalent export. */
export const OutlineExitIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden
    focusable="false"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8 4C7.6534 4.1716 7.31947 4.3648 7 4.57784C4.58803 6.18626 3 8.92538 3 12.034C3 16.9858 7.02944 21 12 21C16.9706 21 21 16.9858 21 12.034C21 8.92538 19.412 6.18626 17 4.57784C16.6805 4.3648 16.3466 4.1716 16 4M12 2V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)
