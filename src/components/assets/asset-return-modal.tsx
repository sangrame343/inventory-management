"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"

const returnSchema = z.object({
  returnedAt: z.string().min(1, "Return date is required"),
  returnReason: z.string().min(1, "Return reason is required"),
  returnCondition: z.string().min(1, "Return condition is required"),
  notes: z.string().optional(),
})

interface AssetReturnModalProps {
  assetId: string
  assetName: string
}

export function AssetReturnModal({ assetId, assetName }: AssetReturnModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      returnedAt: new Date().toISOString().split('T')[0],
      returnReason: "PROJECT_COMPLETE",
      returnCondition: "EXCELLENT",
      notes: "",
    },
  })

  async function onSubmit(values: z.infer<typeof returnSchema>) {
    setLoading(true)
    try {
      const res = await fetch("/api/assets/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          ...values,
        }),
      })

      if (!res.ok) throw new Error("Failed to return asset")

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Return Asset
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>
            Process return for <strong>{assetName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="returnedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="returnReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Reason">
                            {field.value === "PROJECT_COMPLETE" ? "Project Complete" : 
                             field.value === "UPGRADE" ? "Upgrade / Replacement" : 
                             field.value === "RESIGNATION" ? "Employee Resignation" : 
                             field.value === "DAMAGED" ? "Damaged / Repair Needed" : null}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PROJECT_COMPLETE">Project Complete</SelectItem>
                        <SelectItem value="UPGRADE">Upgrade / Replacement</SelectItem>
                        <SelectItem value="RESIGNATION">Employee Resignation</SelectItem>
                        <SelectItem value="DAMAGED">Damaged / Repair Needed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="returnCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Condition">
                            {field.value === "EXCELLENT" ? "Excellent" : 
                             field.value === "GOOD" ? "Good" : 
                             field.value === "FAIR" ? "Fair" : 
                             field.value === "POOR" ? "Poor" : 
                             field.value === "DAMAGED" ? "Damaged" : null}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXCELLENT">Excellent</SelectItem>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="FAIR">Fair</SelectItem>
                        <SelectItem value="POOR">Poor</SelectItem>
                        <SelectItem value="DAMAGED">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any specific issues or observations..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" loading={loading} variant="destructive">
                Confirm Return
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
