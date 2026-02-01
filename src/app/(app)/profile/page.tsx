import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Manage your profile settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Profile management features coming soon!</p>
                </CardContent>
            </Card>
        </div>
    );
}
