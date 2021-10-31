import React, { ReactNode } from 'react';
export interface LoadingContentWrapperProps {
    visible: boolean;
    children: ReactNode;
}
interface LoadingProps {
    visible: boolean;
    children: ReactNode;
    LoadingContentWrapper?: React.ComponentType<LoadingContentWrapperProps>;
    LoadingIcon?: React.ComponentType;
}
export default function Loading({ visible, children, LoadingContentWrapper, LoadingIcon, }: LoadingProps): JSX.Element;
export {};
