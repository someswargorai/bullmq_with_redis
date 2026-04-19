def call(String container_name){
  sh '''
      docker-compose -p ${container_name} down -v --remove-orphans
      docker system prune -af
      docker-compose -p ${container_name} up -d --build
  '''
}
