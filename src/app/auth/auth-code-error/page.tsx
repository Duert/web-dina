export default function AuthCodeError() {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Error de Autenticación</h1>
                <p className="text-gray-400 mb-6">El enlace de confirmación es inválido o ha expirado.</p>
                <a href="/login" className="bg-white text-black px-6 py-2 rounded-full font-bold">Volver al Login</a>
            </div>
        </div>
    );
}
