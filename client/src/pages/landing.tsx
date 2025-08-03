import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-yellow-600 rounded-full flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              El Tiempo Es Plata
            </h1>
            <p className="text-gray-600 mb-8">
              Gestión familiar de tareas donde el tiempo realmente vale
            </p>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-500 mb-6">
                • Parents create paid tasks<br/>
                • Children earn money completing tasks<br/>
                • Seguimiento de pagos pendientes y acumulados
              </div>
              
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-primary hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                Iniciar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
