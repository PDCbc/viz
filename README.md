# Build and Prep
```bash
git clone https://github.com/Hoverbear/scoop-visualizer.git
cd scoop-visualizer
docker build -t visualizer .
docker pull mongo
```

# Run
```bash
docker run -P -d --name=visualizerdb mongo
docker run -d --link visualizerdb:visualizerdb --link queryengine:queryengine -p 8081:8081 -v $(pwd):/app --name=visualizer visualizer
```

# Troubleshooting
On SELinux (Fedora/CentOS/RHEL) you might need to set while in the project directory. [Source](https://access.redhat.com/documentation/en-US/Red_Hat_Enterprise_Linux/7/html/Resource_Management_and_Linux_Containers_Guide/sec-Sharing_Data_Across_Containers.html).

```bash
chcon -Rt svirt_sandbox_file_t $(pwd)
```
