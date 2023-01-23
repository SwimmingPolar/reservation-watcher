#! /bin/sh

echo "SocksPort 127.0.0.1:9050" >> /etc/tor/torrc
echo "MaxCircuitDirtiness 3600" >> /etc/tor/torrc
echo "NewCircuitPeriod 3600" >> /etc/tor/torrc
echo "DNSPort auto" >> /etc/tor/torrc
echo 'ExitPolicy reject *:*' >> /etc/tor/torrc

su -s /bin/sh -c "tor& -f /etc/tor/torrc > /dev/null 2>&1" tor
i=0
until curl --socks5 127.0.0.1:9050 -s https://check.torproject.org/api/ip > /dev/null 2>&1; do
  i=$((i+1))
  sleep 1

  if [ $i -eq 10 ]; then
    echo "Tor is not running"
    exit 1
  fi
done

# remove .new from all files 
ls /etc/privoxy/*.new | xargs -I {} echo mv {} {} | sed 's/\.new//2' | /bin/sh 
file="/etc/privoxy/config"
sed -i '/^listen.*::1/s|^|#|' $file
sed -i '/^listen/s|127\.0\.0\.1||' $file
sed -i 's|^\(accept-intercepted-requests\) .*|\1 1|' $file
sed -i 's|^\(logfile\)|#\1|' $file
sed -i 's|^#\(log-messages\)|\1|' $file
sed -i 's|^#\(log-highlight-messages\)|\1|' $file 
sed -i 's/^#\s*\(forward.*127.*\)/\1/g' $file
sed -i 's/^#\s*\(forward.*localhost.*\)/\1/g' $file

su -s /bin/sh -c "/usr/sbin/privoxy /etc/privoxy/config" privoxy
if [ $? -ne 0 ]; then
  echo "Can't start privoxy"  
  exit 1
fi

node /app/build/index.js