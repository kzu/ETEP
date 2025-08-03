import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserNameSchema, type UpdateUserName } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function NameSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdateUserName>({
    resolver: zodResolver(updateUserNameSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async (data: UpdateUserName) => {
      return await apiRequest("/api/auth/user/name", "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Perfecto",
        description: "Tu información se ha guardado correctamente.",
      });
      // Refresh user data to trigger re-render
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar tu información. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateUserName) => {
    updateNameMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">¡Bienvenido a ETEP!</CardTitle>
          <CardDescription>
            Para personalizar tu experiencia, necesitamos conocer tu nombre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ingresa tu nombre" 
                        {...field}
                        disabled={updateNameMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ingresa tu apellido" 
                        {...field}
                        disabled={updateNameMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateNameMutation.isPending}
              >
                {updateNameMutation.isPending ? "Guardando..." : "Continuar"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}