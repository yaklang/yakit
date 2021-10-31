import React from 'react';
export declare const InlineFlexCell: import("styled-components").StyledComponent<"div", any, {}, never>;
export declare const ExpansionCell: import("styled-components").StyledComponent<"div", any, {}, never>;
interface IconProps extends React.SVGProps<SVGElement> {
    height?: number;
    preserveAspectRatio?: string;
    title?: string;
    viewBox?: string;
    width?: number;
    xmlns?: string;
    ref?: any;
}
declare function CaretDownIcon(props: IconProps): JSX.Element;
declare function InfoIcon(props: IconProps): JSX.Element;
declare function CaretRightIcon(props: IconProps): JSX.Element;
declare function LoadingIcon(props: IconProps): JSX.Element;
export declare const icons: {
    Loading: typeof LoadingIcon;
    CaretDown: typeof CaretDownIcon;
    CaretRight: typeof CaretRightIcon;
    Info: typeof InfoIcon;
};
export {};
