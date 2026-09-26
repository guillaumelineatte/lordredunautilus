import { ContentTabs } from "./tabs";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ContentTabs />
      {children}
    </>
  );
}
