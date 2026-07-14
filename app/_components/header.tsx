import Image from "next/image";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetTrigger } from "./ui/sheet";
import SideBarSheet from "./sidebar-sheet";

const Header = () => {
  return (
    <Card>
      <CardContent className="justify-between items-center flex flex-row p-5">
        <Image
          alt="SpaçoVip"
          src="/LOGO_Spacovip.jpeg"
          height={150}
          width={150}
        />

        {/* TELA DE USUARIO*/}
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            <MenuIcon />
          </SheetTrigger>

          <SideBarSheet />
        </Sheet>
      </CardContent>
    </Card>
  );
};

export default Header;
