import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/Card";
import { NewQuoteForm } from "./NewQuoteForm";

export const metadata = {
  title: "New quote · Greenscape Quote Agent",
};

export default function NewQuotePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Step 1 of 2"
        title="New quote"
        description="Customer details and the raw site walk notes. The agent does the rest — you review before anything goes out."
      />
      <Card>
        <CardBody className="md:px-10 md:py-9">
          <NewQuoteForm />
        </CardBody>
      </Card>
    </div>
  );
}
