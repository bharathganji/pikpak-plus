import React from "react";
import { IonProgressBar } from "@ionic/react";

const LoadingSpinner: React.FC = () => {
  return <IonProgressBar type="indeterminate" />;
};

export default LoadingSpinner;
