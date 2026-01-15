@echo off
echo Liberando porta 3000 no Firewall...
netsh advfirewall firewall add rule name="Observer App Port 3000" dir=in action=allow protocol=TCP localport=3000
echo.
echo Pronto! Agora tente acessar pelo celular no link local.
echo Exemplo: http://SEU_IP:3000
pause
