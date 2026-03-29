"use client";
import { useState, useEffect } from "react";
import { Button, Input, Table, Thead, Tbody, Th, Td, Tr, Badge } from "@/components/ui";
import type { ExpenseCategory } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [newName, setNewName] = useState("");

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }

  useEffect(() => {
    let canceled = false;

    async function loadInitialCategories() {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!canceled) {
        setCategories(data);
      }
    }

    void loadInitialCategories();

    return () => {
      canceled = true;
    };
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchCategories();
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchCategories();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error);
      return;
    }
    fetchCategories();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[#1A1A2E]">Expense Categories</h1>

      <div className="flex gap-2 items-end">
        <Input
          label="New Category"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Entertainment"
        />
        <Button onClick={handleAdd}>Add</Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </Thead>
        <Tbody>
          {categories.map((cat) => (
            <Tr key={cat.id}>
              <Td>{cat.name}</Td>
              <Td>
                <Badge variant={cat.isActive ? "success" : "default"}>
                  {cat.isActive ? "Active" : "Disabled"}
                </Badge>
              </Td>
              <Td className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggle(cat.id, cat.isActive)}
                >
                  {cat.isActive ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(cat.id)}
                >
                  Delete
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
