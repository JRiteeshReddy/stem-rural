import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type CourseFormProps = {
  course?: {
    _id?: string;
    title?: string;
    description?: string;
    targetClass?: string;
    isPublished?: boolean;
  } | null;
  onSubmit: (data: { title: string; description: string; targetClass?: string; isPublished: boolean }) => void;
  onCancel: () => void;
};

export default function CourseForm({ course, onSubmit, onCancel }: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    targetClass: course?.targetClass || "",
    isPublished: course?.isPublished || false,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Target Class</label>
        <Select
          value={formData.targetClass || undefined}
          onValueChange={(value) => setFormData({ ...formData, targetClass: value })}
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
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="published"
          checked={formData.isPublished}
          onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
        />
        <label htmlFor="published" className="text-sm font-medium">Published</label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="bg-green-500 hover:bg-green-600">
          {course ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
