import Image from "next/image";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { MenuIcon } from "lucide-react";

const Header = () => {
  return (
    <Card>
      <CardContent className="justify-between items-center flex flex-row p-5">
        <Image
          alt="SpaçoVip"
          src="/LOGO_Spacovip.jpeg"
          height={18}
          width={120}
        />
        <Button size="icon" variant="outline">
          <MenuIcon />
        </Button>
      </CardContent>
    </Card>
  );
};

export default Header;
