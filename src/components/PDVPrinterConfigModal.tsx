import React from "react";
import { PDVPrinterConfigView, PDVPrinterConfigViewProps } from "./PDVPrinterConfigView";

export interface PDVPrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PDVPrinterConfigViewProps["config"];
  onSaveConfig: PDVPrinterConfigViewProps["onSaveConfig"];
  showNotification: PDVPrinterConfigViewProps["showNotification"];
}

export function PDVPrinterConfigModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  showNotification
}: PDVPrinterConfigModalProps) {
  if (!isOpen) return null;

  return (
    <PDVPrinterConfigView
      config={config}
      onSaveConfig={onSaveConfig}
      showNotification={showNotification}
      onClose={onClose}
      isEmbedded={false}
    />
  );
}
