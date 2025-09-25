import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Student = {
  _id?: string;
  name?: string;
  userClass?: string;
  phoneNumber?: string;
  address?: string;
} | null;

type StudentFormProps = {
  student?: Student;
  onSubmit: (data: { name: string; userClass?: string; phoneNumber?: string; address?: string }) => void;
  onCancel: () => void;
};

export default function StudentForm({ student, onSubmit, onCancel }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: student?.name || "",
    userClass: student?.userClass || "",
    phoneNumber: student?.phoneNumber || "",
    address: student?.address || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Class</label>
        <Select
          value={formData.userClass || undefined}
          onValueChange={(value) => setFormData({ ...formData, userClass: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Class 6">Class 6</SelectItem>
            <SelectItem value="Class 7">Class 7</SelectItem>
            <SelectItem value="Class 8">Class 8</SelectItem>
            <SelectItem value="Class 9">Class 9</SelectItem>
            <SelectItem value="Class 10">Class 10</SelectItem>
            <SelectItem value="Class 11">Class 11</SelectItem>
            <SelectItem value="Class 12">Class 12</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Phone Number</label>
        <Input
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Address</label>
        <Textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="bg-green-500 hover:bg-green-600">
          Update
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
